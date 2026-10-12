/**
 * Construction du prompt de l'analyse d'image.
 *
 * - Les consignes de spécialité (ex. dentaire) ne sont injectées QUE si l'image
 *   est elle-même dentaire (modalité DICOM ou nom de fichier). Sinon : prompt
 *   générique de radiologie, quelle que soit la spécialité du cabinet.
 * - Le modèle décrit sans prescrire : aucune recommandation thérapeutique.
 */
import {
  EXAM_TYPES, REGIONS, LIMITATION_CODES, REQUIRED_COVERAGE, type Lang,
} from "./ai.vision.normalize";

export const PROMPT_VERSION = "vision-2026-10-11b";

/** Modalités DICOM dentaires : PX = panoramique, IO = intra-orale. */
const DENTAL_MODALITIES = new Set(["PX", "IO"]);
const DENTAL_TITLE = /(pano|opg|orthopan|r[ée]tro[- ]?alv|bite[- ]?wing|intra[- ]?oral|periapical|p[ée]ri[- ]?apical|cbct|dentaire|dental)/i;

export function isDentalImage(modality: unknown, title: unknown): boolean {
  const m = typeof modality === "string" ? modality.trim().toUpperCase() : "";
  const t = typeof title === "string" ? title : "";
  return DENTAL_MODALITIES.has(m) || DENTAL_TITLE.test(t);
}

const LANGUAGE_RULE: Record<Lang, string> = {
  fr: "Write ALL free-text fields (anatomicalLevel, limitations, coverage[].note, findings[].location, findings[].description, disclaimer) STRICTLY in medical French.",
  en: "Write ALL free-text fields (anatomicalLevel, limitations, coverage[].note, findings[].location, findings[].description, disclaimer) STRICTLY in medical English.",
  ar: "Write ALL free-text fields (anatomicalLevel, limitations, coverage[].note, findings[].location, findings[].description, disclaimer) STRICTLY in Modern Standard medical Arabic.",
};

const DISCLAIMER: Record<Lang, string> = {
  fr: "Analyse assistée par IA, outil d'aide à la visualisation. Elle ne constitue pas un diagnostic et doit être validée par le praticien.",
  en: "AI-assisted analysis, a visualization aid. It is not a diagnosis and must be validated by the clinician.",
  ar: "تحليل بمساعدة الذكاء الاصطناعي، أداة دعم للرؤية. لا يُعد تشخيصاً ويجب أن يصادق عليه الطبيب.",
};

const PLACEHOLDER: Record<Lang, { level: string; limit: string; note: string; loc: string; desc: string }> = {
  fr: { level: "Étage anatomique précis", limit: "Limite de lecture concrète", note: "Motif du statut", loc: "Structure anatomique précise", desc: "Sémiologie précise et mesurable" },
  en: { level: "Precise anatomical level", limit: "Concrete reading limitation", note: "Reason for status", loc: "Precise anatomical structure", desc: "Precise, measurable semiology" },
  ar: { level: "المستوى التشريحي الدقيق", limit: "قيد قراءة محدد", note: "سبب الحالة", loc: "البنية التشريحية الدقيقة", desc: "وصف شعاعي دقيق وقابل للقياس" },
};

const coverageTable = () =>
  (Object.entries(REQUIRED_COVERAGE) as [string, readonly string[]][])
    .filter(([, regions]) => regions.length > 0)
    .map(([exam, regions]) => `   - ${exam}: ${regions.join(", ")}`)
    .join("\n");

export function buildVisionPrompt(opts: { language: Lang; dental: boolean }): { system: string; user: string } {
  const { language, dental } = opts;
  const p = PLACEHOLDER[language];

  const dentalBlock = dental
    ? `
DENTAL IMAGE RULES (applied because the image is identified as dental):
- Every non-normal finding on a tooth MUST include "toothFDI" (FDI numbering 11-48, deciduous 51-85).
- On a panoramic (OPG), the PATIENT'S RIGHT is on the IMAGE LEFT. Set laterality accordingly.
- Describe existing restorations (radio-opaque fillings/crowns) and endodontic treatments when visible.
- Assess each third molar separately (18, 28, 38, 48).
- An OPG has low sensitivity for proximal caries: never write "no caries"; at most "no obvious carious lesion on this image".
- An impacted asymptomatic tooth is a "risk" (basis = "risk"), not an observed abnormality.`
    : "";

  const system = `You are a technical radiology image-description assistant for clinicians, following ESR structured reporting principles.
You DESCRIBE images. You NEVER prescribe treatment, extraction, surgery or follow-up. Do not output recommendations.
${LANGUAGE_RULE[language]}

RULES:
1. EVALUABILITY: if the image cannot be read (major artifacts, extreme motion, out of field), set "isEvaluable": false with "evaluableReason".
2. EXAM TYPE: set "examType" to exactly one of: ${EXAM_TYPES.join(" | ")}.
   An axial CT slice that includes the shoulders (humeral heads, scapulae, clavicles) is "ct_cervicothoracic", NOT "ct_neck".
3. ANATOMICAL LEVEL: "anatomicalLevel" must name the real level (e.g. axial CT at the cervicothoracic junction, including shoulder girdles).
4. LIMITATIONS FIRST: list every reading limitation in "limitationCodes" (one or more of: ${LIMITATION_CODES.join(", ")}) and describe them in "limitations".
   Horizontal streaks across the shoulders are "streak_artifact". If contrast administration is unknown, add "contrast_unknown".
5. MANDATORY COVERAGE: for the chosen examType, return a "coverage" entry for EVERY region below, with status "evaluated" | "partially_evaluated" | "not_evaluated":
${coverageTable()}
   Allowed region tokens: ${REGIONS.join(", ")}.
   Use "partially_evaluated" when artifacts, field of view or resolution limit the region. Use "not_evaluated" when you cannot assess it.
6. NO GLOBAL NEGATIONS: never write sentences such as "no significant abnormality", "no mass", "healthy teeth".
   A normal statement (isNormal = true) is allowed ONLY for a region whose coverage status is "evaluated", and must name the exact structure.
7. FINDINGS: each finding has canonical fields (strict English tokens):
   - type: "observation" | "artifact" | "abnormality"
   - basis: "observed" (seen on the image) | "risk" (hypothetical/potential, not seen)
   - severity: "low" | "moderate" | "high"  ("high" ONLY for an observed abnormality, never for a risk)
   - confidence: "low" | "medium" | "high"
   - region: one region token from the list above
   - laterality: "right" | "left" | "midline" | "bilateral" | "unspecified" (patient side)
   - toothFDI: array of FDI numbers ([] if not dental)
   - isNormal: true | false
   Artifacts: type = "artifact", isNormal = true, severity = "low".
   Describe dense structures precisely (e.g. a markedly hyperdense structure next to the airway may be an opacified vessel: say so with low confidence rather than ignoring it).
8. NO VAGUE WORDING: forbidden phrases include "density variations in soft tissues", "elements of interest", "within normal limits" without a named structure.
${dentalBlock}

Respond ONLY with valid JSON using this structure:
{
  "isEvaluable": true,
  "evaluableReason": "",
  "examType": "ct_cervicothoracic",
  "anatomicalLevel": "${p.level}",
  "limitationCodes": ["streak_artifact"],
  "limitations": ["${p.limit}"],
  "coverage": [
    { "region": "soft_tissues", "status": "partially_evaluated", "note": "${p.note}" }
  ],
  "findings": [
    {
      "type": "observation",
      "basis": "observed",
      "region": "airway",
      "location": "${p.loc}",
      "laterality": "midline",
      "toothFDI": [],
      "description": "${p.desc}",
      "isNormal": true,
      "severity": "low",
      "confidence": "medium"
    }
  ],
  "disclaimer": "${DISCLAIMER[language]}"
}`;

  const user =
    language === "ar"
      ? "صِف هذه الصورة الطبية وصفاً شعاعياً منظماً، مع ذكر القيود أولاً وتغطية كل المناطق المطلوبة، دون أي توصية علاجية."
      : language === "en"
      ? "Describe this medical image in a structured radiological way: limitations first, every required region covered, no treatment recommendation."
      : "Décris cette image médicale de façon radiologique structurée : limites d'abord, chaque région obligatoire couverte, aucune recommandation thérapeutique.";

  return { system, user };
}
