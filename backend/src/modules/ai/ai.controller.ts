/**
 * AI Module — Controller
 *
 * Handles HTTP requests for AI suggestion generation.
 * Enforces that tenantId comes from req.user (set by requireAuth middleware).
 *
 * Route: POST /api/v1/ai/conversations/:conversationId/suggestion
 *
 * Error mapping:
 *   ConversationNotFoundError   → 404
 *   ProviderNotConfiguredError  → 503
 *   ProviderUnavailableError    → 503
 *   Any other error             → 500
 *
 * SECURITY:
 *   - tenantId is NEVER read from req.body, req.query, or req.params
 *   - AI credentials are NEVER included in any HTTP response
 *   - conversationId is the only external identifier accepted from params
 */

import { Response } from "express";
import { isValidObjectId } from "mongoose";
import { AuthRequest } from "../../shared/middleware/requireAuth";
import { Patient } from "../patients/patient.model";
import { AIService } from "./ai.service";
import { normalizeAnalysis } from "./ai.vision.normalize";
import { buildVisionPrompt, isDentalImage, PROMPT_VERSION } from "./ai.vision.prompt";
import { OpenAICompatibleProvider } from "./openai-compatible.provider";
import { ConversationNotFoundError, ProviderNotConfiguredError, ProviderUnavailableError } from "./ai.errors";
import {
  executeAIAction,
  InvalidActionTypeError,
  ActionTargetNotFoundError,
  ActionConversationMismatchError,
  ActionTransitionError,
} from "./ai.action.executor";

// Singleton service — provider is injected here and can be swapped for tests
const defaultProvider = new OpenAICompatibleProvider();
const defaultAIService = new AIService(defaultProvider);

export async function getAISuggestion(req: AuthRequest, res: Response): Promise<void> {
  // tenantId MUST come from the auth middleware — never from request input
  const tenantId = req.user?.tenantId;
  if (!tenantId) {
    res.status(403).json({ error: "Forbidden: authentication required" });
    return;
  }

  const rawConversationId = req.params["conversationId"];
  const conversationId = Array.isArray(rawConversationId) ? rawConversationId[0] : rawConversationId;
  if (!conversationId) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  try {
    const result = await defaultAIService.getSuggestion(tenantId, conversationId);
    res.status(200).json({
      suggestion: result.suggestion,
      intent: result.intent ?? null,
      needsHumanEscalation: result.needsHumanEscalation,
      action: result.action ?? null,
    });
  } catch (err) {
    if (err instanceof ConversationNotFoundError) {
      res.status(404).json({ error: err.message });
      return;
    }
    if (err instanceof ProviderNotConfiguredError) {
      res.status(503).json({ error: err.message });
      return;
    }
    if (err instanceof ProviderUnavailableError) {
      res.status(503).json({ error: err.message });
      return;
    }
    // Unexpected error — log it but never expose internals
    console.error("[AI] Unexpected error in getAISuggestion:", (err as Error).message);
    res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * POST /api/v1/ai/conversations/:conversationId/actions/execute
 *
 * Executes an AI-proposed action ONLY after explicit human approval.
 *
 * SECURITY:
 *   - tenantId from JWT only
 *   - conversation must belong to tenant
 *   - target (recovery/appointment) must belong to same patient as conversation
 *   - action type validated against allowlist
 *   - confidence is NEVER used as authorization criteria
 */
export async function executeAIActionHandler(req: AuthRequest, res: Response): Promise<void> {
  const tenantId = req.user?.tenantId;
  if (!tenantId) {
    res.status(403).json({ error: "Forbidden: authentication required" });
    return;
  }

  const rawConversationId = req.params["conversationId"];
  const conversationId = Array.isArray(rawConversationId) ? rawConversationId[0] : rawConversationId;
  if (!conversationId) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  const { type, targetId, booking } = req.body;
  if (!type || !targetId) {
    res.status(400).json({ error: "Missing required fields: type, targetId" });
    return;
  }

  try {
    const result = await executeAIAction(tenantId, conversationId, { type, targetId, booking });
    res.status(200).json(result);
  } catch (err) {
    if (err instanceof InvalidActionTypeError) {
      res.status(400).json({ error: err.message });
      return;
    }
    if (err instanceof ActionTargetNotFoundError) {
      res.status(404).json({ error: err.message });
      return;
    }
    if (err instanceof ActionConversationMismatchError) {
      res.status(400).json({ error: err.message });
      return;
    }
    if (err instanceof ActionTransitionError) {
      res.status(409).json({ error: err.message });
      return;
    }
    console.error("[AI] Unexpected error in executeAIActionHandler:", (err as Error).message);
    res.status(500).json({ error: "Internal server error" });
  }
}

const LANGS = ["fr", "ar", "en"] as const;
type SupportedLang = typeof LANGS[number];

/**
 * POST /api/v1/ai/analyze-image
 * Vision AI Analysis for medical and dental imaging.
 */
export async function analyzeMedicalImageHandler(req: AuthRequest, res: Response): Promise<void> {
  const tenantId = req.user?.tenantId;
  if (!tenantId) {
    res.status(403).json({ error: "Forbidden: authentication required" });
    return;
  }

  const rawLang = req.body.language;
  const language: SupportedLang = LANGS.includes(rawLang) ? rawLang : "fr";

  const rawPatientId = req.body.patientId;
  const patientId = typeof rawPatientId === "string" && isValidObjectId(rawPatientId)
    ? rawPatientId
    : undefined;

  const rawFileId = req.body.fileId;
  const fileId = typeof rawFileId === "string" && rawFileId.length < 200
    ? rawFileId
    : undefined;

  const forceRefresh = Boolean(req.body.forceRefresh);

  const { imageBase64, modality, title } = req.body;
  if (!imageBase64 || typeof imageBase64 !== "string") {
    res.status(400).json({ error: "Missing or invalid imageBase64" });
    return;
  }

  // Sanity check: prevent memory exhaustion from oversized base64 (> 65MB)
  if (imageBase64.length > 65 * 1024 * 1024) {
    res.status(413).json({ error: "Payload too large" });
    return;
  }

  // Cache check: ignore cache if promptVersion differs or not found
  if (patientId && fileId && !forceRefresh) {
    try {
      const patientDoc = await Patient.findOne({ _id: patientId, tenantId }).select("files").lean();
      const existingFile = patientDoc?.files?.find((f: any) => f.id === fileId || f._id?.toString() === fileId);
      const cachedEntry = existingFile?.aiAnalysis?.[language];
      if (cachedEntry && cachedEntry.promptVersion === PROMPT_VERSION && cachedEntry.analysis) {
        res.status(200).json(cachedEntry.analysis);
        return;
      }
    } catch (cacheErr) {
      console.warn("[AI Vision] Cache check error, proceeding to live analysis:", cacheErr);
    }
  }

  const providerUrl = process.env.AI_PROVIDER_URL?.trim()?.replace(/^["']|["']$/g, "");
  const apiKey = process.env.AI_API_KEY?.trim()?.replace(/^["']|["']$/g, "");
  const model = process.env.AI_MODEL?.trim()?.replace(/^["']|["']$/g, "") || "gpt-4o-mini";

  if (!providerUrl || !apiKey) {
    res.status(503).json({ error: "AI provider not configured" });
    return;
  }

  try {
    // Les consignes dentaires ne s'appliquent qu'aux images dentaires (modalité/nom de fichier),
    // jamais à un scanner cervical d'un cabinet dentaire.
    const dental = isDentalImage(modality, title);
    const { system: prompt, user: userPrompt } = buildVisionPrompt({ language, dental });

    if (process.env.AI_DEBUG_PROMPT === "true") {
      // Journalisation du prompt réellement envoyé (sans l'image) pour les tests.
      console.log("[AI Vision] prompt", JSON.stringify({ promptVersion: PROMPT_VERSION, language, dental, modality, title, system: prompt, user: userPrompt }));
    }

    const endpoint = `${providerUrl}/chat/completions`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: prompt },
          {
            role: "user",
            content: [
              { type: "text", text: userPrompt },
              {
                type: "image_url",
                image_url: {
                  url: imageBase64.startsWith("data:") ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`,
                  detail: "high"
                }
              }
            ]
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.0
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[AI Vision] Provider error:", response.status, errText);
      res.status(502).json({ error: "Erreur du fournisseur d'IA lors de l'analyse d'image" });
      return;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    let rawParsed: unknown = null;
    try {
      rawParsed = JSON.parse(content);
    } catch {
      rawParsed = null;
    }

    // Normalisation pure et stricte (hors prompt)
    const analysis = normalizeAnalysis(rawParsed, language);

    // Persistance dans MongoDB avec métadonnées de versioning
    if (patientId && fileId) {
      try {
        await Patient.updateOne(
          { _id: patientId, tenantId, "files.id": fileId },
          {
            $set: {
              [`files.$.aiAnalysis.${language}`]: {
                analysis,
                raw: rawParsed,
                model,
                promptVersion: PROMPT_VERSION,
                dentalRulesApplied: dental,
                createdAt: new Date(),
              },
            },
          }
        );
      } catch (saveErr) {
        console.warn("[AI Vision] Could not persist analysis:", saveErr);
      }
    }

    res.status(200).json(analysis);
  } catch (error: any) {
    console.error("[AI Vision] Unexpected error in analyzeMedicalImageHandler:", error?.message);
    res.status(500).json({ error: "Failed to analyze image" });
  }
}
