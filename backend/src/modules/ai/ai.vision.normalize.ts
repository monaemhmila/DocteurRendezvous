/**
 * Normalisation stricte de la sortie du modèle de vision.
 *
 * Principe : le serveur ne lit QUE des champs structurés (jetons canoniques),
 * jamais le texte libre. Les règles cliniques de cohérence sont appliquées ici,
 * par le code, et non laissées au modèle.
 */

export type Severity = "low" | "moderate" | "high";
export type FindingType = "observation" | "artifact" | "abnormality";
export type Laterality = "right" | "left" | "midline" | "bilateral" | "unspecified";
export type Basis = "observed" | "risk";
export type Confidence = "low" | "medium" | "high";
export type CoverageStatus = "evaluated" | "partially_evaluated" | "not_evaluated";
export type Lang = "fr" | "en" | "ar";

export const SEVERITIES: Severity[] = ["low", "moderate", "high"];
export const TYPES: FindingType[] = ["observation", "artifact", "abnormality"];
export const LATERALITIES: Laterality[] = ["right", "left", "midline", "bilateral", "unspecified"];
export const BASES: Basis[] = ["observed", "risk"];
export const CONFIDENCES: Confidence[] = ["low", "medium", "high"];
export const COVERAGE_STATUSES: CoverageStatus[] = ["evaluated", "partially_evaluated", "not_evaluated"];

export const EXAM_TYPES = [
  "ct_neck",
  "ct_cervicothoracic",
  "ct_other",
  "dental_panoramic",
  "dental_intraoral",
  "chest_radiograph",
  "radiograph_other",
  "other",
] as const;
export type ExamType = typeof EXAM_TYPES[number];

export const REGIONS = [
  "airway", "spine", "soft_tissues", "vessels", "thyroid", "shoulder_girdle", "lung_apices",
  "lungs", "heart", "mediastinum", "pleura", "bones", "devices",
  "teeth", "restorations", "endodontic_treatments", "periapical", "alveolar_bone",
  "maxillary_sinuses", "mandibular_canals", "tmj_condyles", "third_molars",
  "other",
] as const;
export type Region = typeof REGIONS[number];

export const LIMITATION_CODES = [
  "streak_artifact", "motion_artifact", "beam_hardening", "noise",
  "contrast_unknown", "partial_field_of_view", "low_resolution",
  "low_sensitivity_proximal_caries", "burned_in_text", "other",
] as const;
export type LimitationCode = typeof LIMITATION_CODES[number];

/** Liste de couverture obligatoire par type d'examen. Une région absente est affichée « non évaluée ». */
export const REQUIRED_COVERAGE: Record<ExamType, Region[]> = {
  ct_neck: ["airway", "spine", "soft_tissues", "vessels", "thyroid"],
  ct_cervicothoracic: ["airway", "spine", "soft_tissues", "vessels", "thyroid", "shoulder_girdle", "lung_apices"],
  ct_other: [],
  dental_panoramic: [
    "teeth", "restorations", "endodontic_treatments", "periapical", "alveolar_bone",
    "maxillary_sinuses", "mandibular_canals", "tmj_condyles", "third_molars",
  ],
  dental_intraoral: ["teeth", "restorations", "periapical", "alveolar_bone"],
  chest_radiograph: ["lungs", "heart", "mediastinum", "pleura", "bones", "devices"],
  radiograph_other: [],
  other: [],
};

/** Artéfacts qui dégradent la lecture des tissus mous en TDM. */
const SOFT_TISSUE_DEGRADING: LimitationCode[] = ["streak_artifact", "beam_hardening", "motion_artifact", "noise"];
const SOFT_TISSUE_REGIONS: Region[] = ["soft_tissues", "vessels", "thyroid"];
const TOOTH_REGIONS: Region[] = ["teeth", "restorations", "endodontic_treatments", "periapical", "third_molars"];

export interface Finding {
  type: FindingType;
  basis: Basis;
  region: Region;
  location: string;
  laterality: Laterality;
  toothFDI: number[];
  description: string;
  isNormal: boolean;
  severity: Severity;
  confidence: Confidence;
  reviewRequired: boolean;
  flags: string[];
}

export interface CoverageItem {
  region: Region;
  status: CoverageStatus;
  note: string;
  /** true si la région a été ajoutée ou rétrogradée par le serveur. */
  enforced: boolean;
}

export interface Analysis {
  schemaVersion: 2;
  isEvaluable: boolean;
  evaluableReason: string;
  examType: ExamType;
  anatomicalLevel: string;
  limitationCodes: LimitationCode[];
  limitations: string[];
  coverage: CoverageItem[];
  summary: string;
  findings: Finding[];
  disclaimer: string;
  reviewRequired: boolean;
  issues: string[];
}

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const strArr = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim() !== "").map((x) => x.trim()) : [];
const oneOf = <T extends string>(list: readonly T[], v: unknown): v is T => typeof v === "string" && (list as readonly string[]).includes(v);

/** FDI : permanentes 11-18, 21-28, 31-38, 41-48 ; temporaires 51-55, 61-65, 71-75, 81-85. */
export function isValidFDI(n: unknown): n is number {
  if (typeof n !== "number" || !Number.isInteger(n)) return false;
  const q = Math.floor(n / 10);
  const t = n % 10;
  if (q >= 1 && q <= 4) return t >= 1 && t <= 8;
  if (q >= 5 && q <= 8) return t >= 1 && t <= 5;
  return false;
}

const EXAM_LABELS: Record<Lang, Record<ExamType, string>> = {
  fr: {
    ct_neck: "Scanner cervical",
    ct_cervicothoracic: "Scanner cervico-thoracique",
    ct_other: "Scanner",
    dental_panoramic: "Radiographie panoramique dentaire (OPG)",
    dental_intraoral: "Radiographie dentaire intra-orale",
    chest_radiograph: "Radiographie thoracique",
    radiograph_other: "Radiographie",
    other: "Examen d'imagerie non classé",
  },
  en: {
    ct_neck: "Neck CT",
    ct_cervicothoracic: "Cervicothoracic CT",
    ct_other: "CT",
    dental_panoramic: "Dental panoramic radiograph (OPG)",
    dental_intraoral: "Intraoral dental radiograph",
    chest_radiograph: "Chest radiograph",
    radiograph_other: "Radiograph",
    other: "Unclassified imaging study",
  },
  ar: {
    ct_neck: "تصوير مقطعي للعنق",
    ct_cervicothoracic: "تصوير مقطعي عنقي صدري",
    ct_other: "تصوير مقطعي",
    dental_panoramic: "صورة بانورامية للأسنان (OPG)",
    dental_intraoral: "صورة شعاعية داخل الفم",
    chest_radiograph: "صورة شعاعية للصدر",
    radiograph_other: "صورة شعاعية",
    other: "فحص تصويري غير مصنف",
  },
};

/** Synthèse dérivée exclusivement des champs structurés (pas de texte libre du modèle). */
export function buildSummary(a: Omit<Analysis, "summary">, lang: Lang): string {
  const exam = EXAM_LABELS[lang][a.examType];
  const abnormal = a.findings.filter((f) => f.type === "abnormality" && f.basis === "observed").length;
  const risks = a.findings.filter((f) => f.basis === "risk").length;
  const notEval = a.coverage.filter((c) => c.status === "not_evaluated").length;
  const partial = a.coverage.filter((c) => c.status === "partially_evaluated").length;
  const limited = a.limitationCodes.length > 0;

  if (lang === "en") {
    return [
      `${exam}.`,
      `${a.findings.length} item(s) described, including ${abnormal} observed abnormality(ies)${risks ? ` and ${risks} potential risk(s)` : ""}.`,
      `Coverage: ${partial} region(s) partially evaluated, ${notEval} not evaluated.`,
      limited ? "Reading limited — see limitations." : "",
      a.reviewRequired ? "Practitioner review required." : "",
    ].filter(Boolean).join(" ");
  }
  if (lang === "ar") {
    return [
      `${exam}.`,
      `${a.findings.length} عنصر موصوف، منها ${abnormal} شذوذ مرصود${risks ? ` و${risks} خطر محتمل` : ""}.`,
      `التغطية: ${partial} منطقة مقيّمة جزئياً، ${notEval} غير مقيّمة.`,
      limited ? "القراءة محدودة — انظر القيود." : "",
      a.reviewRequired ? "مراجعة الطبيب مطلوبة." : "",
    ].filter(Boolean).join(" ");
  }
  return [
    `${exam}.`,
    `${a.findings.length} élément(s) décrit(s), dont ${abnormal} anomalie(s) observée(s)${risks ? ` et ${risks} risque(s) potentiel(s)` : ""}.`,
    `Couverture : ${partial} région(s) partiellement évaluée(s), ${notEval} non évaluée(s).`,
    limited ? "Lecture limitée — voir les limites." : "",
    a.reviewRequired ? "Relecture par le praticien requise." : "",
  ].filter(Boolean).join(" ");
}

function unusable(reason: string, disclaimer = "", issues: string[] = ["unusable_model_output"]): Analysis {
  return {
    schemaVersion: 2,
    isEvaluable: false,
    evaluableReason: reason,
    examType: "other",
    anatomicalLevel: "",
    limitationCodes: [],
    limitations: [],
    coverage: [],
    summary: "",
    findings: [],
    disclaimer,
    reviewRequired: true,
    issues,
  };
}

export function normalizeAnalysis(raw: unknown, lang: Lang = "fr"): Analysis {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return unusable("Réponse du modèle non exploitable.");
  }
  const r = raw as Record<string, unknown>;
  const issues: string[] = [];

  if (typeof r.isEvaluable !== "boolean") issues.push("isEvaluable_missing");
  const isEvaluable = r.isEvaluable === true;
  const evaluableReason = str(r.evaluableReason);

  if (!isEvaluable) {
    if (!evaluableReason) issues.push("not_evaluable_without_reason");
    const base = unusable(evaluableReason || "Cliché non évaluable.", str(r.disclaimer), issues);
    return { ...base, anatomicalLevel: str(r.anatomicalLevel) };
  }

  // ── Type d'examen ────────────────────────────────────────────────
  const examType: ExamType = oneOf(EXAM_TYPES, r.examType) ? r.examType : "other";
  if (!oneOf(EXAM_TYPES, r.examType) || examType === "other") issues.push("exam_type_unrecognized");
  const isDental = examType === "dental_panoramic" || examType === "dental_intraoral";

  // ── Limites ──────────────────────────────────────────────────────
  const limitationCodes = new Set<LimitationCode>(
    (Array.isArray(r.limitationCodes) ? r.limitationCodes : []).filter((c): c is LimitationCode => oneOf(LIMITATION_CODES, c)),
  );
  // L'OPG est peu sensible pour les caries proximales : limite imposée par le code.
  if (examType === "dental_panoramic") limitationCodes.add("low_sensitivity_proximal_caries");

  // ── Couverture ───────────────────────────────────────────────────
  const coverageMap = new Map<Region, CoverageItem>();
  for (const item of Array.isArray(r.coverage) ? r.coverage : []) {
    const c = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
    if (!oneOf(REGIONS, c.region)) continue;
    const status: CoverageStatus = oneOf(COVERAGE_STATUSES, c.status) ? c.status : "not_evaluated";
    if (!oneOf(COVERAGE_STATUSES, c.status)) issues.push("coverage_status_invalid");
    coverageMap.set(c.region, { region: c.region, status, note: str(c.note), enforced: !oneOf(COVERAGE_STATUSES, c.status) });
  }

  // Région obligatoire non traitée → « non évaluée », jamais passée sous silence.
  let missingRequired = false;
  for (const region of REQUIRED_COVERAGE[examType]) {
    if (!coverageMap.has(region)) {
      coverageMap.set(region, { region, status: "not_evaluated", note: "", enforced: true });
      missingRequired = true;
    }
  }
  if (missingRequired) issues.push("coverage_incomplete");

  // Artéfacts dégradant les tissus mous → ces régions ne peuvent pas être « évaluées ».
  const hasSoftTissueArtifact = SOFT_TISSUE_DEGRADING.some((c) => limitationCodes.has(c));
  if (hasSoftTissueArtifact && examType.startsWith("ct_")) {
    for (const region of SOFT_TISSUE_REGIONS) {
      const c = coverageMap.get(region);
      if (c && c.status === "evaluated") coverageMap.set(region, { ...c, status: "partially_evaluated", enforced: true });
    }
  }
  // OPG : les dents ne peuvent pas être déclarées entièrement évaluées (caries proximales).
  if (examType === "dental_panoramic") {
    const c = coverageMap.get("teeth");
    if (c && c.status === "evaluated") coverageMap.set("teeth", { ...c, status: "partially_evaluated", enforced: true });
  }

  // ── Findings ─────────────────────────────────────────────────────
  const findings: Finding[] = [];
  for (const item of Array.isArray(r.findings) ? r.findings : []) {
    const f = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
    const flags: string[] = [];

    const validType = oneOf(TYPES, f.type);
    const validSeverity = oneOf(SEVERITIES, f.severity);
    const validNormal = typeof f.isNormal === "boolean";
    const description = str(f.description);

    if (!validType || !validSeverity || !validNormal || !description) flags.push("finding_invalid");

    // Valeurs par défaut prudentes : l'incertain n'est jamais présenté comme normal.
    const type: FindingType = validType ? (f.type as FindingType) : "observation";
    let severity: Severity = validSeverity ? (f.severity as Severity) : "moderate";
    let isNormal: boolean = validNormal && validSeverity && validType ? (f.isNormal as boolean) : false;

    // basis absent → traité comme « observé » (on ne rétrograde pas sans information), mais signalé.
    const basis: Basis = oneOf(BASES, f.basis) ? f.basis : "observed";
    if (!oneOf(BASES, f.basis)) flags.push("basis_missing");

    const confidence: Confidence = oneOf(CONFIDENCES, f.confidence) ? f.confidence : "low";
    const region: Region = oneOf(REGIONS, f.region) ? f.region : "other";
    const toothFDI = (Array.isArray(f.toothFDI) ? f.toothFDI : []).filter(isValidFDI);

    if (type === "artifact") {
      // Décision sur le champ structuré « type », pas sur le texte.
      isNormal = true;
      severity = "low";
    } else {
      if (isNormal && severity !== "low") flags.push("normal_with_elevated_severity");

      // Un risque hypothétique n'est jamais « élevé » : seule une anomalie observée peut l'être.
      if (basis === "risk") {
        if (severity === "high") {
          severity = "moderate";
          flags.push("risk_severity_capped");
        }
        isNormal = false;
      }

      // Une négation (« sans anomalie ») n'est permise que sur une région entièrement évaluée.
      if (isNormal) {
        const cov = coverageMap.get(region);
        if (!cov) flags.push("negative_without_coverage");
        else if (cov.status !== "evaluated") flags.push("negative_on_limited_region");
      }

      // Dentaire : toute observation non normale sur une dent exige une numérotation FDI.
      if (isDental && !isNormal && TOOTH_REGIONS.includes(region) && toothFDI.length === 0) {
        flags.push("missing_fdi");
      }
    }

    // risk_severity_capped est une correction appliquée, pas une incohérence à revoir.
    const reviewFlags = flags.filter((x) => x !== "risk_severity_capped");
    issues.push(...reviewFlags);

    findings.push({
      type,
      basis,
      region,
      location: str(f.location),
      laterality: oneOf(LATERALITIES, f.laterality) ? f.laterality : "unspecified",
      toothFDI,
      description,
      isNormal,
      severity,
      confidence,
      reviewRequired: reviewFlags.length > 0,
      flags,
    });
  }

  // ── Contrôle de l'étage (champs structurés uniquement) ───────────
  // « cervical » seul alors qu'une ceinture scapulaire est décrite → incohérent.
  if (examType === "ct_neck") {
    const shoulderCov = coverageMap.get("shoulder_girdle");
    const shoulderSeen =
      (shoulderCov && shoulderCov.status !== "not_evaluated") || findings.some((f) => f.region === "shoulder_girdle");
    if (shoulderSeen) issues.push("level_inconsistent_shoulder_girdle_on_neck_ct");
  }

  if (findings.length === 0 && coverageMap.size === 0) issues.push("empty_analysis");

  // Ordre stable : régions obligatoires d'abord.
  const required = REQUIRED_COVERAGE[examType];
  const coverage = [...coverageMap.values()].sort((a, b) => {
    const ia = required.indexOf(a.region);
    const ib = required.indexOf(b.region);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });

  const uniqueIssues = [...new Set(issues)];
  const partial: Omit<Analysis, "summary"> = {
    schemaVersion: 2,
    isEvaluable: true,
    evaluableReason: "",
    examType,
    anatomicalLevel: str(r.anatomicalLevel),
    limitationCodes: [...limitationCodes],
    limitations: strArr(r.limitations),
    coverage,
    findings,
    disclaimer: str(r.disclaimer),
    reviewRequired: uniqueIssues.length > 0 || findings.some((x) => x.reviewRequired),
    issues: uniqueIssues,
  };

  return { ...partial, summary: buildSummary(partial, lang) };
}
