import React from "react";
import { AlertTriangle, ShieldAlert, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

type Lang = "fr" | "en" | "ar";

const L = <T extends string>(map: Record<T, [string, string, string]>) => (key: string, lang: Lang) => {
  const entry = (map as Record<string, [string, string, string]>)[key];
  if (!entry) return key;
  return lang === "en" ? entry[1] : lang === "ar" ? entry[2] : entry[0];
};

const regionLabel = L({
  airway: ["Voies aériennes", "Airway", "المسالك الهوائية"],
  spine: ["Rachis", "Spine", "العمود الفقري"],
  soft_tissues: ["Tissus mous", "Soft tissues", "الأنسجة الرخوة"],
  vessels: ["Vaisseaux", "Vessels", "الأوعية"],
  thyroid: ["Thyroïde", "Thyroid", "الغدة الدرقية"],
  shoulder_girdle: ["Ceinture scapulaire", "Shoulder girdle", "الحزام الكتفي"],
  lung_apices: ["Apex pulmonaires", "Lung apices", "قمم الرئتين"],
  lungs: ["Poumons", "Lungs", "الرئتان"],
  heart: ["Cœur", "Heart", "القلب"],
  mediastinum: ["Médiastin", "Mediastinum", "المنصف"],
  pleura: ["Plèvre", "Pleura", "الجنبة"],
  bones: ["Os", "Bones", "العظام"],
  devices: ["Matériel", "Devices", "الأجهزة"],
  teeth: ["Dents", "Teeth", "الأسنان"],
  restorations: ["Restaurations", "Restorations", "الترميمات"],
  endodontic_treatments: ["Traitements endodontiques", "Endodontic treatments", "علاجات الجذور"],
  periapical: ["Régions péri-apicales", "Periapical regions", "المناطق حول الذروية"],
  alveolar_bone: ["Os alvéolaire", "Alveolar bone", "العظم السنخي"],
  maxillary_sinuses: ["Sinus maxillaires", "Maxillary sinuses", "الجيوب الفكية"],
  mandibular_canals: ["Canaux mandibulaires", "Mandibular canals", "القنوات الفكية السفلية"],
  tmj_condyles: ["ATM / condyles", "TMJ / condyles", "المفصل الصدغي الفكي / اللقم"],
  third_molars: ["Troisièmes molaires", "Third molars", "الأضراس الثالثة"],
  other: ["Autre", "Other", "أخرى"],
});

const limitationLabel = L({
  streak_artifact: ["Artéfacts de stries", "Streak artifacts", "تشوهات خطية"],
  motion_artifact: ["Artéfact cinétique", "Motion artifact", "تشوه حركي"],
  beam_hardening: ["Durcissement de faisceau", "Beam hardening", "تصلب الحزمة"],
  noise: ["Bruit d'image", "Image noise", "ضجيج الصورة"],
  contrast_unknown: ["Injection de contraste inconnue", "Contrast use unknown", "استخدام التباين غير معروف"],
  partial_field_of_view: ["Champ de vue partiel", "Partial field of view", "مجال رؤية جزئي"],
  low_resolution: ["Résolution faible", "Low resolution", "دقة منخفضة"],
  low_sensitivity_proximal_caries: ["OPG : sensibilité limitée pour les caries proximales", "OPG: limited sensitivity for proximal caries", "البانورامية: حساسية محدودة للتسوسات الملاصقة"],
  burned_in_text: ["Texte incrusté dans l'image", "Burned-in text", "نص مدمج في الصورة"],
  other: ["Autre limite", "Other limitation", "قيد آخر"],
});

const statusLabel = L({
  evaluated: ["Évalué", "Evaluated", "مُقيَّم"],
  partially_evaluated: ["Partiel", "Partial", "جزئي"],
  not_evaluated: ["Non évalué", "Not evaluated", "غير مُقيَّم"],
});

const severityLabel = L({
  low: ["FAIBLE", "LOW", "منخفضة"],
  moderate: ["MODÉRÉE", "MODERATE", "متوسطة"],
  high: ["ÉLEVÉE", "HIGH", "عالية"],
});

const confidenceLabel = L({
  low: ["confiance faible", "low confidence", "ثقة منخفضة"],
  medium: ["confiance moyenne", "medium confidence", "ثقة متوسطة"],
  high: ["confiance élevée", "high confidence", "ثقة عالية"],
});

const lateralityLabel = L({
  right: ["droite", "right", "يمين"],
  left: ["gauche", "left", "يسار"],
  midline: ["médian", "midline", "خط الوسط"],
  bilateral: ["bilatéral", "bilateral", "ثنائي"],
  unspecified: ["", "", ""],
});

const tr = (lang: Lang, fr: string, en: string, ar: string) => (lang === "en" ? en : lang === "ar" ? ar : fr);

const STATUS_STYLE: Record<string, string> = {
  evaluated: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  partially_evaluated: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  not_evaluated: "bg-white/5 text-white/50 border-white/15",
};

const SEVERITY_STYLE: Record<string, string> = {
  high: "bg-red-500/20 text-red-300 border-red-500/30",
  moderate: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  low: "bg-blue-500/20 text-blue-300 border-blue-500/30",
};

export function AiReportPanel({ result, language, onClose, fallbackDisclaimer }: {
  result: any;
  language: string;
  onClose: () => void;
  fallbackDisclaimer: string;
}) {
  const lang: Lang = language === "en" || language === "ar" ? language : "fr";
  const findings: any[] = Array.isArray(result?.findings) ? result.findings : [];
  const coverage: any[] = Array.isArray(result?.coverage) ? result.coverage : [];
  const limitationCodes: string[] = Array.isArray(result?.limitationCodes) ? result.limitationCodes : [];
  const limitations: string[] = Array.isArray(result?.limitations) ? result.limitations : [];
  const isLegacy = result?.schemaVersion !== 2;

  return (
    <div className="space-y-4" dir={lang === "ar" ? "rtl" : "ltr"}>
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <h3 className="text-emerald-400 font-semibold text-sm flex items-center gap-2">
          <Sparkles className="size-4 text-emerald-400" />
          {tr(lang, "Rapport d'analyse IA", "AI Analysis Report", "تقرير تحليل الذكاء الاصطناعي")}
        </h3>
        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-white/60 hover:text-white" onClick={onClose}>✕</Button>
      </div>

      {isLegacy && (
        <div className="rounded-lg bg-white/5 border border-white/15 p-2.5 text-[11px] text-white/70">
          {tr(lang, "Ancien format de rapport : relancez l'analyse pour obtenir couverture et limites.", "Legacy report format: re-run the analysis to get coverage and limitations.", "تنسيق تقرير قديم: أعد التحليل للحصول على التغطية والقيود.")}
        </div>
      )}

      {result?.isEvaluable === false && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-xs text-red-300 space-y-1">
          <p className="font-semibold text-red-200">⚠️ {tr(lang, "Cliché non évaluable radiologiquement", "Image not radiologically evaluable", "الصورة غير قابلة للتقييم الشعاعي")}</p>
          <p className="text-[11px] text-red-300/80">{result.evaluableReason}</p>
        </div>
      )}

      {result?.reviewRequired && result?.isEvaluable !== false && (
        <div className="rounded-lg bg-purple-500/10 border border-purple-500/30 p-2.5 text-[11px] text-purple-200 flex gap-2">
          <ShieldAlert className="size-4 shrink-0" />
          <span>{tr(lang, "Rapport incomplet ou incohérent : relecture par le praticien obligatoire avant tout usage.", "Incomplete or inconsistent report: clinician review required before any use.", "تقرير غير مكتمل أو غير متسق: مراجعة الطبيب إلزامية قبل أي استخدام.")}</span>
        </div>
      )}

      {/* Limites affichées en tête */}
      {(limitationCodes.length > 0 || limitations.length > 0) && (
        <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3 text-xs text-amber-200 space-y-1.5">
          <p className="font-semibold text-amber-300 flex items-center gap-1.5">
            <AlertTriangle className="size-3.5" />
            {tr(lang, "Limites de lecture", "Reading limitations", "قيود القراءة")}
          </p>
          {limitationCodes.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {limitationCodes.map((c) => (
                <span key={c} className="px-1.5 py-0.5 rounded border border-amber-500/30 bg-amber-500/10 text-[10px]">{limitationLabel(c, lang)}</span>
              ))}
            </div>
          )}
          {limitations.length > 0 && (
            <ul className="list-disc ps-4 space-y-0.5 text-[11px] text-amber-100/80">
              {limitations.map((l, i) => <li key={i}>{l}</li>)}
            </ul>
          )}
        </div>
      )}

      {result?.anatomicalLevel && (
        <div className="flex items-start gap-1.5 px-2.5 py-1.5 rounded bg-white/5 border border-white/10 text-[11px] text-emerald-300 font-mono">
          <span className="text-white/50 shrink-0">{tr(lang, "Étage :", "Level:", "المستوى :")}</span>
          <span>{result.anatomicalLevel}</span>
        </div>
      )}

      {result?.summary && (
        <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-200 leading-relaxed">
          <p className="font-semibold mb-1 text-emerald-300">{tr(lang, "Synthèse :", "Summary:", "ملخص :")}</p>
          {result.summary}
        </div>
      )}

      {coverage.length > 0 && (
        <div className="space-y-1.5">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-white/70">{tr(lang, "Couverture", "Coverage", "التغطية")}</h4>
          <div className="space-y-1">
            {coverage.map((c) => (
              <div key={c.region} className="flex items-start justify-between gap-2 text-[11px]">
                <div className="min-w-0">
                  <span className="text-white/85">{regionLabel(c.region, lang)}</span>
                  {c.note && <span className="block text-white/45 leading-snug">{c.note}</span>}
                </div>
                <span className={`shrink-0 px-1.5 py-0.5 rounded border text-[10px] font-semibold ${STATUS_STYLE[c.status] || STATUS_STYLE["not_evaluated"]}`}>
                  {statusLabel(c.status, lang)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {findings.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-white/70">{tr(lang, "Observations", "Findings", "الملاحظات")}</h4>
          {/* Pas de zone de défilement imbriquée : toutes les cartes restent visibles dans le panneau. */}
          <div className="space-y-2">
            {findings.map((f, idx) => {
              const side = lateralityLabel(f.laterality, lang);
              const fdi = Array.isArray(f.toothFDI) && f.toothFDI.length ? `FDI ${f.toothFDI.join(", ")}` : "";
              return (
                <div key={idx} className="rounded-md bg-white/5 border border-white/10 p-2.5 text-xs space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium text-white/90 min-w-0">{f.location || regionLabel(f.region, lang)}</span>
                    {f.reviewRequired ? (
                      <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        {tr(lang, "À vérifier", "Verify", "للمراجعة")}
                      </span>
                    ) : (
                      <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase border ${SEVERITY_STYLE[f.severity] || SEVERITY_STYLE["moderate"]}`}>
                        {severityLabel(f.severity, lang)}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1 text-[10px] text-white/55">
                    {f.basis === "risk" && <span className="px-1 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30">{tr(lang, "Risque potentiel — à évaluer cliniquement", "Potential risk — assess clinically", "خطر محتمل — يُقيَّم سريرياً")}</span>}
                    {f.type === "artifact" && <span className="px-1 rounded bg-white/10">{tr(lang, "Artéfact", "Artifact", "تشوه")}</span>}
                    {fdi && <span className="px-1 rounded bg-white/10 font-mono">{fdi}</span>}
                    {side && <span>{side}</span>}
                    {f.confidence && <span>· {confidenceLabel(f.confidence, lang)}</span>}
                  </div>
                  <p className="text-[11px] text-white/70 leading-relaxed">{f.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="rounded-lg p-2.5 border border-amber-400/20 bg-amber-400/5 text-amber-300 text-[10px] leading-relaxed">
        ⚠️ {result?.disclaimer || fallbackDisclaimer}
      </div>
    </div>
  );
}
