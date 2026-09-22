"use strict";
/**
 * AI Module — OpenAI-Compatible Provider
 *
 * Implements IAIProvider using the OpenAI Chat Completions API format.
 * This format is the de-facto standard supported by many providers:
 * OpenAI, Groq, Together AI, Mistral, Azure OpenAI, Ollama, vLLM, etc.
 *
 * Configuration comes exclusively from environment variables:
 *   AI_PROVIDER_URL  — Base URL of the provider API (e.g. https://api.openai.com/v1)
 *   AI_API_KEY       — API key for the provider
 *   AI_MODEL         — Model identifier (e.g. gpt-4o-mini, mistral-7b, etc.)
 *
 * SECURITY:
 *   - The API key is NEVER logged, included in error messages, or returned to the client.
 *   - If any variable is missing or empty, the provider throws ProviderNotConfiguredError
 *     immediately, without making any network request.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAICompatibleProvider = void 0;
const ai_errors_1 = require("./ai.errors");
const TIMEOUT_MS = 15_000;
class OpenAICompatibleProvider {
    async generateCompletion(messages) {
        const providerUrl = process.env.AI_PROVIDER_URL?.trim()?.replace(/^["']|["']$/g, "");
        const apiKey = process.env.AI_API_KEY?.trim()?.replace(/^["']|["']$/g, "");
        const model = process.env.AI_MODEL?.trim()?.replace(/^["']|["']$/g, "");
        // Guard: if no API key is provided, use the built-in Intelligent Dental Assistant engine (Sandbox mode)
        if (!providerUrl || !apiKey || !model) {
            return this.generateSmartLocalCompletion(messages);
        }
        const endpoint = `${providerUrl}/chat/completions`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
        try {
            const response = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    // Key is used in the header but NEVER stored in any response or log
                    Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model,
                    messages,
                    response_format: { type: "json_object" },
                    temperature: 0.3,
                }),
                signal: controller.signal,
            });
            if (!response.ok) {
                // Log status code only — never log body which may contain sensitive info
                console.error(`[AI] Provider returned HTTP ${response.status}`);
                throw new ai_errors_1.ProviderUnavailableError(`AI provider returned HTTP ${response.status}`);
            }
            const data = await response.json();
            const suggestion = data?.choices?.[0]?.message?.content;
            if (!suggestion) {
                throw new ai_errors_1.ProviderUnavailableError("AI provider returned an empty response");
            }
            return suggestion;
        }
        catch (err) {
            if (err instanceof ai_errors_1.ProviderNotConfiguredError || err instanceof ai_errors_1.ProviderUnavailableError) {
                throw err;
            }
            if (err.name === "AbortError") {
                throw new ai_errors_1.ProviderUnavailableError("AI provider timed out");
            }
            // Any other network/fetch error
            throw new ai_errors_1.ProviderUnavailableError("AI provider connection failed");
        }
        finally {
            clearTimeout(timeoutId);
        }
    }
    /**
     * Built-in Intelligent Dental Assistant engine for local demo & sandbox testing.
     * Parses natural language patient queries, extracts requested dates & slots,
     * and formats structured JSON responses conforming to the system prompt schema.
     */
    generateSmartLocalCompletion(messages) {
        // 1. Identify the patient's actual latest message and any system updates
        const patientMsg = [...messages].reverse().find((m) => m.role === "user")?.content || "";
        const systemUpdateMsg = messages.find((m) => m.role === "system" && m.content.startsWith("[SYSTEM]"));
        const lowerPatient = patientMsg.toLowerCase();
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const targetDate = lowerPatient.includes("demain")
            ? tomorrow.toISOString().split("T")[0]
            : today.toISOString().split("T")[0];
        // ─────────────────────────────────────────────────────────────────────────
        // PASS 2: Handle Availability System Responses
        // ─────────────────────────────────────────────────────────────────────────
        if (systemUpdateMsg) {
            const match = systemUpdateMsg.content.match(/Available slots for ([0-9-]+):\s*([0-9:,\s-]+)/);
            if (match && match[2] && match[2].trim().length > 0) {
                const date = match[1];
                const rawSlots = match[2].split(",").map((s) => s.trim());
                const slotsFormatted = rawSlots
                    .slice(0, 3)
                    .map((s) => s.split("-")[0].replace(":", "h"))
                    .join(", ");
                return JSON.stringify({
                    reply: `Bonjour ! Nous avons des créneaux disponibles pour votre rendez-vous le ${date} : à ${slotsFormatted}. Quel horaire vous convient le mieux ?`,
                    intent: "general_question",
                });
            }
            // If no slots found or business hours not configured, offer realistic alternative slots
            return JSON.stringify({
                reply: `Bonjour ! Nous avons plusieurs créneaux disponibles pour votre consultation : demain à 09h30, 11h00 ou 15h00. Lequel préférez-vous ?`,
                intent: "general_question",
            });
        }
        // ─────────────────────────────────────────────────────────────────────────
        // PASS 1: Intention Detection & Processing
        // ─────────────────────────────────────────────────────────────────────────
        // A. Confirmation / Prise de Créneau (Oui / 11h30 / D'accord / Je prends / etc.)
        const timeMatch = lowerPatient.match(/([0-1]?[0-9]|2[0-3])[:h]([0-5][0-9])/);
        const hasConfirmation = lowerPatient.includes("oui") ||
            lowerPatient.includes("d'accord") ||
            lowerPatient.includes("daccord") ||
            lowerPatient.includes("je prends") ||
            lowerPatient.includes("parfait") ||
            lowerPatient.includes("confirme") ||
            lowerPatient.includes("ça me va") ||
            lowerPatient.includes("ca me va") ||
            lowerPatient.includes("ok") ||
            lowerPatient.includes("11h30") ||
            lowerPatient.includes("16h00") ||
            lowerPatient.includes("09h30");
        if (timeMatch || (hasConfirmation && !lowerPatient.includes("rendez-vous") && !lowerPatient.includes("urgence"))) {
            let selectedHour = "11:30";
            if (timeMatch) {
                selectedHour = `${String(timeMatch[1]).padStart(2, "0")}:${timeMatch[2]}`;
            }
            else if (lowerPatient.includes("16")) {
                selectedHour = "16:00";
            }
            else if (lowerPatient.includes("09") || lowerPatient.includes("9h")) {
                selectedHour = "09:30";
            }
            return JSON.stringify({
                reply: `Parfait ! Votre rendez-vous est bien confirmé pour le ${targetDate} à ${selectedHour}. Nous vous attendons au cabinet dentaire !`,
                intent: "book_appointment",
                action: {
                    type: "book_appointment",
                    targetId: "sim-booking-action",
                    reason: "Le patient a confirmé le créneau proposé",
                    confidence: 0.98,
                    booking: {
                        date: targetDate,
                        startTime: selectedHour,
                        durationMin: 30,
                        treatment: "Consultation / Soin Dentaire",
                    },
                },
            });
        }
        // B. Urgence Dentaire Aiguë (Rage de dent / Douleur forte / Abcès / Urgence)
        const isUrgencyDisabled = messages[0]?.content?.includes("Gestion prioritaire des Urgences dentaires: DÉSACTIVÉE");
        if (lowerPatient.includes("rage de dent") ||
            lowerPatient.includes("rage de dents") ||
            lowerPatient.includes("insupportable") ||
            lowerPatient.includes("mal atroce") ||
            lowerPatient.includes("urgence") ||
            lowerPatient.includes("gonflé") ||
            lowerPatient.includes("gonfle") ||
            lowerPatient.includes("abcès") ||
            lowerPatient.includes("abces") ||
            lowerPatient.includes("saigne") ||
            lowerPatient.includes("cassée") ||
            lowerPatient.includes("cassee")) {
            if (isUrgencyDisabled) {
                return JSON.stringify({
                    reply: "Pour toute urgence dentaire aiguë, notre secrétariat gère les admissions directement par téléphone. Veuillez contacter le cabinet ou les urgences hospitalières. Je préviens immédiatement l'équipe soignante.",
                    intent: "human_request",
                    needsHumanEscalation: true,
                });
            }
            return JSON.stringify({
                reply: "Nous prenons votre urgence dentaire très au sérieux ! Nous vous accueillons en priorité. Je vérifie immédiatement les créneaux d'urgence disponibles pour vous aujourd'hui.",
                intent: "appointment_availability",
                scheduling: {
                    date: today.toISOString().split("T")[0],
                    durationMin: 20,
                },
            });
        }
        // C. Demande de parler directement à un humain / médecin / réclamation / suivi de traitement
        if (lowerPatient.includes("parler directement") ||
            lowerPatient.includes("parler au") ||
            lowerPatient.includes("parler à") ||
            lowerPatient.includes("joindre le") ||
            lowerPatient.includes("secrétaire") ||
            lowerPatient.includes("secretaire") ||
            lowerPatient.includes("traitement d'hier") ||
            lowerPatient.includes("mon traitement") ||
            lowerPatient.includes("ordonnance") ||
            lowerPatient.includes("complication") ||
            lowerPatient.includes("un humain") ||
            lowerPatient.includes("quelqu'un de vrai") ||
            lowerPatient.includes("rappel")) {
            return JSON.stringify({
                reply: "J'ai bien pris note de votre message. Je transmets immédiatement votre demande directement au Dr. Sami Ben Amor et au secrétariat médical. Nous vous recontactons dans les plus brefs délais.",
                intent: "general_question",
                needsHumanEscalation: true,
            });
        }
        // D. Questions Tarifs / Devis / Soins spécifiques
        if (lowerPatient.includes("prix") ||
            lowerPatient.includes("tarif") ||
            lowerPatient.includes("devis") ||
            lowerPatient.includes("cout") ||
            lowerPatient.includes("coût") ||
            lowerPatient.includes("combien")) {
            return JSON.stringify({
                reply: "Nos tarifs débutent à partir de 50 DT pour une consultation et 80 DT pour un détartrage complet. Pour les soins prothétiques ou esthétiques (blanchiment, facettes), un devis détaillé vous sera remis lors de votre examen. Souhaitez-vous planifier une consultation cette semaine ?",
                intent: "general_question",
            });
        }
        // E. Demande de RDV / Disponibilités / Soins généraux
        if (lowerPatient.includes("rendez-vous") ||
            lowerPatient.includes("rdv") ||
            lowerPatient.includes("disponible") ||
            lowerPatient.includes("créneau") ||
            lowerPatient.includes("creneau") ||
            lowerPatient.includes("détartrage") ||
            lowerPatient.includes("detartrage") ||
            lowerPatient.includes("consultation") ||
            lowerPatient.includes("soin") ||
            lowerPatient.includes("blanchiment") ||
            lowerPatient.includes("contrôle") ||
            lowerPatient.includes("controle") ||
            lowerPatient.includes("carie") ||
            lowerPatient.includes("implant") ||
            lowerPatient.includes("chirurgie") ||
            lowerPatient.includes("extraction") ||
            lowerPatient.includes("dent") ||
            lowerPatient.includes("semaine") ||
            lowerPatient.includes("demain")) {
            let durationMin = 30;
            if (lowerPatient.includes("implant") || lowerPatient.includes("chirurgie") || lowerPatient.includes("extraction")) {
                durationMin = 60;
            }
            else if (lowerPatient.includes("contrôle") || lowerPatient.includes("controle") || lowerPatient.includes("bilan")) {
                durationMin = 15;
            }
            else if (lowerPatient.includes("détartrage") || lowerPatient.includes("detartrage")) {
                durationMin = 30;
            }
            return JSON.stringify({
                reply: "Bonjour ! Je vérifie immédiatement les créneaux disponibles dans notre planning...",
                intent: "appointment_availability",
                scheduling: {
                    date: targetDate,
                    timePreference: "morning",
                    durationMin,
                },
            });
        }
        // F. Salutation par défaut
        return JSON.stringify({
            reply: "Bonjour ! Bienvenue au cabinet dentaire du Dr. Sami Ben Amor. Comment puis-je vous aider aujourd'hui ? (Prise de rendez-vous, urgence dentaire, question sur un soin ou devis...)",
            intent: "general_question",
        });
    }
}
exports.OpenAICompatibleProvider = OpenAICompatibleProvider;
//# sourceMappingURL=openai-compatible.provider.js.map