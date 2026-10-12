import React, { useEffect, useMemo, useRef, useState } from "react";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import {
  AlertTriangle,
  Download,
  FileImage,
  Film,
  Grid3X3,
  Info,
  Loader2,
  Maximize,
  MousePointer2,
  RotateCw,
  Ruler,
  ScanLine,
  Settings2,
  ShieldCheck,
  Sparkles,
  Sun,
  Contrast,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { DicomViewer } from "./DicomViewer";
import { AiReportPanel } from "./AiReportPanel";
import { useAppState } from "@/hooks/use-app-state";

/**
 * Sanovia AI Medical Image Viewer — safe foundation v1
 */

const translations = {
  fr: {
    protectedAccess: "Accès protégé par votre cabinet. Les résultats affichés doivent être interprétés et validés par un professionnel de santé.",
    studies: "Études",
    noStudy: "Aucune étude disponible.",
    unknownStudyDate: "Date inconnue",
    seriesLabel: "Séries",
    imagesCount: "image(s)",
    dicomBadge: "DICOM",
    importStudy: "Importer une étude",
    uploading: "Transmission…",
    uploadSuccess: "Fichier transmis pour validation",
    uploadError: "Le fichier n’a pas pu être transmis",
    formatError: "Format non pris en charge. Utilisez un fichier DICOM ou image accepté par le cabinet.",
    sizeError: "Fichier trop volumineux. La limite configurée est de 250 MB.",
    downloadServerAuth: "Le téléchargement doit être autorisé par le serveur du cabinet.",
    downloadError: "Téléchargement non autorisé ou indisponible",
    aiDisabled: "L’analyse IA n’est pas activée pour cet environnement.",
    aiRequestSent: "Demande envoyée. Le résultat sera affiché uniquement après validation du service autorisé.",
    aiRequestError: "La demande d’analyse IA n’a pas abouti",
    measureDisabled: "Mesure indisponible : calibration DICOM Pixel Spacing absente.",
    toolPan: "Déplacer / zoomer",
    toolMeasure: "Mesure calibrée",
    toolInvert: "Inverser",
    toolGrid: "Grille visuelle",
    toolRotate: "Rotation",
    toolAi: "Demander une analyse IA autorisée",
    calibrationNA: "NON DISPONIBLE",
    reset: "RÉINITIALISER",
    calibrationUnavailable: "Calibration indisponible",
    displaySettings: "Affichage",
    brightness: "Luminosité",
    contrast: "Contraste",
    disclaimer: "Cet affichage est un outil de visualisation. Il ne constitue pas un diagnostic.",
    measureAvailableMsg: "Mesure calibrée disponible pour cette image.",
    measureDisabledMsg: "Mesure désactivée : Pixel Spacing absent.",
    compareMode: "Comparer",
    btnDownload: "Télécharger via le serveur autorisé",
    btnClose: "Fermer",
    importedOn: "IMPORTÉ LE"
  },
  en: {
    protectedAccess: "Access protected by your clinic. Displayed results must be interpreted and validated by a healthcare professional.",
    studies: "Studies",
    noStudy: "No study available.",
    unknownStudyDate: "Unknown date",
    seriesLabel: "Series",
    imagesCount: "image(s)",
    dicomBadge: "DICOM",
    importStudy: "Import study",
    uploading: "Uploading…",
    uploadSuccess: "File submitted for validation",
    uploadError: "File could not be submitted",
    formatError: "Unsupported format. Use a DICOM or image file accepted by the clinic.",
    sizeError: "File too large. Configured limit is 250 MB.",
    downloadServerAuth: "Download must be authorized by the clinic server.",
    downloadError: "Download unauthorized or unavailable",
    aiDisabled: "AI analysis is not enabled for this environment.",
    aiRequestSent: "Request sent. The result will be displayed only after validation from the authorized service.",
    aiRequestError: "AI analysis request failed",
    measureDisabled: "Measurement unavailable: DICOM Pixel Spacing calibration missing.",
    toolPan: "Pan / Zoom",
    toolMeasure: "Calibrated measurement",
    toolInvert: "Invert",
    toolGrid: "Visual grid",
    toolRotate: "Rotate",
    toolAi: "Request authorized AI analysis",
    calibrationNA: "NOT AVAILABLE",
    reset: "RESET",
    calibrationUnavailable: "Calibration unavailable",
    displaySettings: "Display",
    brightness: "Brightness",
    contrast: "Contrast",
    disclaimer: "This display is a visualization tool. It does not constitute a diagnosis.",
    measureAvailableMsg: "Calibrated measurement available for this image.",
    measureDisabledMsg: "Measurement disabled: Pixel Spacing missing.",
    compareMode: "Compare",
    btnDownload: "Download via authorized server",
    btnClose: "Close",
    importedOn: "IMPORTED"
  },
  ar: {
    protectedAccess: "وصول محمي بواسطة العيادة. يجب تفسير النتائج المعروضة والتحقق منها من قبل أخصائي رعاية صحية.",
    studies: "الدراسات",
    noStudy: "لا توجد دراسة متاحة.",
    unknownStudyDate: "تاريخ غير معروف",
    seriesLabel: "السلاسل",
    imagesCount: "صورة",
    dicomBadge: "DICOM",
    importStudy: "استيراد دراسة",
    uploading: "جاري الإرسال…",
    uploadSuccess: "تم إرسال الملف للتحقق",
    uploadError: "تعذر إرسال الملف",
    formatError: "تنسيق غير مدعوم. استخدم ملف DICOM أو صورة مقبولة من قبل العيادة.",
    sizeError: "الملف كبير جدا. الحد المسموح به هو 250 ميغابايت.",
    downloadServerAuth: "يجب تفويض التنزيل بواسطة خادم العيادة.",
    downloadError: "التنزيل غير مصرح به أو غير متاح",
    aiDisabled: "تحليل الذكاء الاصطناعي غير مفعل في هذه البيئة.",
    aiRequestSent: "تم إرسال الطلب. سيتم عرض النتيجة فقط بعد التحقق من الخدمة المصرح بها.",
    aiRequestError: "فشل طلب تحليل الذكاء الاصطناعي",
    measureDisabled: "القياس غير متاح: معايرة DICOM Pixel Spacing مفقودة.",
    toolPan: "تحريك / تكبير",
    toolMeasure: "قياس معاير",
    toolInvert: "عكس",
    toolGrid: "شبكة بصرية",
    toolRotate: "دوران",
    toolAi: "طلب تحليل ذكاء اصطناعي مصرح به",
    calibrationNA: "غير متاح",
    reset: "إعادة ضبط",
    calibrationUnavailable: "المعايرة غير متاحة",
    displaySettings: "العرض",
    brightness: "السطوع",
    contrast: "التباين",
    disclaimer: "هذا العرض أداة تصور. ولا يشكل تشخيصا طبيا.",
    measureAvailableMsg: "القياس المعاير متاح لهذه الصورة.",
    measureDisabledMsg: "القياس معطل: Pixel Spacing مفقود.",
    compareMode: "مقارنة",
    btnDownload: "تنزيل عبر خادم مصرح",
    btnClose: "إغلاق",
    importedOn: "تاريخ الاستيراد"
  }
};

export interface DicomInstance {
  id: string;
  sopInstanceUID?: string;
  url: string;
  title: string;
  date?: string;
  mimeType?: string;
  instanceNumber?: number;
  frameCount?: number;
  rows?: number;
  columns?: number;
  pixelSpacing?: [number, number];
  modality?: string;
  isDicom?: boolean;
}

export interface DicomSeries {
  id: string;
  seriesInstanceUID?: string;
  description?: string;
  modality?: string;
  seriesNumber?: number;
  instances: DicomInstance[];
}

export interface DicomStudy {
  id: string;
  studyInstanceUID?: string;
  patientDisplayName?: string;
  studyDate?: string;
  accessionNumber?: string;
  description?: string;
  series: DicomSeries[];
}

export interface MedicalImageViewerProps {
  patientId: string;
  studies?: DicomStudy[];
  images?: DicomInstance[];
  onUploadSuccess?: () => void;
  onUpload?: (file: File) => Promise<void>;
  onRequestDownload?: (instance: DicomInstance) => Promise<void>;
  onRequestAiAnalysis?: (instance: DicomInstance, imageBase64?: string, language?: string) => Promise<any>;
  onAuditEvent?: (event: {
    type: "view" | "download" | "upload" | "ai_request";
    studyId?: string;
    seriesId?: string;
    instanceId?: string;
  }) => void;
  isReadOnly?: boolean;
}

type Tool = "pan" | "measure";
type Point = { 
  pixelX: number; 
  pixelY: number; 
  pctX: number; 
  pctY: number; 
};

function formatDistance(instance: DicomInstance | undefined, points: Point[]) {
  if (points.length !== 2) return null;
  // If DICOM pixelSpacing is present, use exact calibrated spacing.
  // Otherwise, fallback to standard digital sensor calibration (0.15 mm/px).
  const [spacingY, spacingX] = instance?.pixelSpacing || [0.15, 0.15];
  if (!Number.isFinite(spacingX) || !Number.isFinite(spacingY) || spacingX <= 0 || spacingY <= 0) return null;
  const dx = (points[1]!.pixelX - points[0]!.pixelX) * spacingX;
  const dy = (points[1]!.pixelY - points[0]!.pixelY) * spacingY;
  const value = Math.sqrt(dx * dx + dy * dy);
  return {
    value,
    isEstimated: !instance?.pixelSpacing
  };
}

function isDicomInstance(instance: DicomInstance) {
  return Boolean(
    instance.isDicom ||
      instance.mimeType === "application/dicom" ||
      instance.url?.toLowerCase().includes("dicom") ||
      instance.title?.toLowerCase().endsWith(".dcm"),
  );
}

function getAuthUrl(instance: DicomInstance, patientId: string) {
  if (!instance.url) return "";
  let url = instance.url;
  
  // Convert legacy /uploads/ URLs to the secure API endpoint
  if (url.startsWith("/uploads/")) {
    url = `/api/v1/patients/${patientId}/files/${instance.id}/download`;
  }
  
  // If URL is relative, prepend the backend host
  if (url.startsWith("/")) {
    const apiBase = (import.meta.env['VITE_API_URL'] || 'http://localhost:5000/api/v1').replace(/\/api\/v1\/?$/, '');
    url = `${apiBase}${url}`;
  }
  
  const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
  if (token) {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}token=${token}`;
  }
  return url;
}

function normalizeLegacyImages(images: DicomInstance[] = []): DicomStudy[] {
  if (images.length === 0) return [];
  return [
    {
      id: "legacy-study",
      description: "Images",
      series: [
        {
          id: "legacy-series",
          description: "Main",
          instances: images,
        },
      ],
    },
  ];
}

export function MedicalImageViewer({
  patientId,
  studies: providedStudies,
  images = [],
  onUploadSuccess,
  onUpload,
  onRequestDownload,
  onRequestAiAnalysis,
  onAuditEvent,
  isReadOnly = false,
}: MedicalImageViewerProps) {
  const { language = 'fr' } = useAppState();
  const t = translations[language as keyof typeof translations] || translations['fr'];

  const studies = providedStudies?.length ? providedStudies : normalizeLegacyImages(images);
  const allInstances = useMemo(
    () => studies.flatMap((study) => study.series.flatMap((series) => series.instances)),
    [studies],
  );

  const [selectedStudyId, setSelectedStudyId] = useState(studies[0]?.id ?? null);
  const [selectedSeriesId, setSelectedSeriesId] = useState(studies[0]?.series[0]?.id ?? null);
  const [selectedInstanceId, setSelectedInstanceId] = useState(allInstances[0]?.id ?? null);
  const [compareInstanceId, setCompareInstanceId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isRequestingAi, setIsRequestingAi] = useState(false);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [invert, setInvert] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [showGrid, setShowGrid] = useState(false);
  const [activeTool, setActiveTool] = useState<Tool>("pan");
  const [measurePoints, setMeasurePoints] = useState<Point[]>([]);
  const [aiResult, setAiResult] = useState<any>(null);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);

  const selectedStudy = studies.find((study) => study.id === selectedStudyId) ?? studies[0];
  const selectedSeries = selectedStudy?.series.find((series) => series.id === selectedSeriesId) ?? selectedStudy?.series[0];
  const activeInstance = selectedSeries?.instances.find((instance) => instance.id === selectedInstanceId) ?? selectedSeries?.instances[0];
  const compareInstance = allInstances.find((instance) => instance.id === compareInstanceId);
  const activeIsDicom = activeInstance ? isDicomInstance(activeInstance) : false;
  const distanceInfo = formatDistance(activeInstance, measurePoints);

  useEffect(() => {
    if (!activeInstance || !isOpen) return;
    onAuditEvent?.({
      type: "view",
      studyId: selectedStudy?.id,
      seriesId: selectedSeries?.id,
      instanceId: activeInstance.id,
    });
  }, [activeInstance?.id, isOpen, onAuditEvent, selectedSeries?.id, selectedStudy?.id]);

  const resetView = () => {
    setBrightness(100);
    setContrast(100);
    setInvert(false);
    setRotation(0);
    setMeasurePoints([]);
    setActiveTool("pan");
    setAiResult(null);
    setShowAiPanel(false);
  };

  // Reset adjustments, measurements and AI results whenever the selected image/instance changes
  useEffect(() => {
    resetView();
  }, [selectedInstanceId]);

  const selectStudy = (study: DicomStudy) => {
    const nextSeries = study.series[0];
    const nextInstance = nextSeries?.instances[0];
    setSelectedStudyId(study.id);
    setSelectedSeriesId(nextSeries?.id ?? null);
    setSelectedInstanceId(nextInstance?.id ?? null);
    resetView();
  };

  const selectSeries = (series: DicomSeries) => {
    setSelectedSeriesId(series.id);
    setSelectedInstanceId(series.instances[0]?.id ?? null);
    resetView();
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !onUpload || isReadOnly) return;

    const allowed = file.type === "application/dicom" || file.name.toLowerCase().endsWith(".dcm") || file.type.startsWith("image/");
    const maxBytes = 250 * 1024 * 1024;
    if (!allowed) {
      toast.error(t.formatError);
      return;
    }
    if (file.size > maxBytes) {
      toast.error(t.sizeError);
      return;
    }

    setIsUploading(true);
    try {
      await onUpload(file);
      onAuditEvent?.({ type: "upload" });
      onUploadSuccess?.();
      toast.success(t.uploadSuccess);
    } catch {
      toast.error(t.uploadError);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = async () => {
    if (!activeInstance || !onRequestDownload) {
      toast.info(t.downloadServerAuth);
      return;
    }
    try {
      await onRequestDownload(activeInstance);
      onAuditEvent?.({ type: "download", studyId: selectedStudy?.id, seriesId: selectedSeries?.id, instanceId: activeInstance.id });
    } catch {
      toast.error(t.downloadError);
    }
  };

  const handleAiRequest = async () => {
    if (!activeInstance || !onRequestAiAnalysis) {
      toast.info(t.aiDisabled);
      return;
    }
    setIsRequestingAi(true);
    try {
      let imageBase64 = "";
      if (activeIsDicom) {
        const canvas = document.querySelector(".relative canvas") as HTMLCanvasElement;
        if (canvas) {
          imageBase64 = canvas.toDataURL("image/jpeg", 0.9);
        }
      } else {
        // Toujours ré-encoder via un canvas : seuls les pixels sont envoyés,
        // les métadonnées du fichier (EXIF, commentaires, etc.) sont supprimées.
        const authUrl = getAuthUrl(activeInstance, patientId);
        try {
          const resp = await fetch(authUrl);
          const blob = await resp.blob();
          const bitmap = await createImageBitmap(blob);
          const offscreen = document.createElement("canvas");
          offscreen.width = bitmap.width;
          offscreen.height = bitmap.height;
          offscreen.getContext("2d")?.drawImage(bitmap, 0, 0);
          bitmap.close();
          imageBase64 = offscreen.toDataURL("image/jpeg", 0.92);
        } catch (fetchErr) {
          console.warn("Direct fetch failed, falling back to offscreen canvas", fetchErr);
          if (imageRef.current) {
            const img = imageRef.current;
            const offscreen = document.createElement("canvas");
            offscreen.width = img.naturalWidth || 800;
            offscreen.height = img.naturalHeight || 800;
            const ctx = offscreen.getContext("2d");
            if (ctx) {
              ctx.drawImage(img, 0, 0);
              imageBase64 = offscreen.toDataURL("image/jpeg", 0.9);
            }
          }
        }
      }

      if (!imageBase64) {
        toast.error("Impossible de capturer l'image pour analyse.");
        return;
      }

      const result = await onRequestAiAnalysis(activeInstance, imageBase64, language);
      setAiResult(result);
      setShowAiPanel(true);
      onAuditEvent?.({ type: "ai_request", studyId: selectedStudy?.id, seriesId: selectedSeries?.id, instanceId: activeInstance.id });
      toast.success(language === "ar" ? "تم اكتمال تحليل الذكاء الاصطناعي بنجاح!" : "Analyse IA terminée avec succès !");
    } catch (err: any) {
      console.error(err);
      toast.error(t.aiRequestError);
    } finally {
      setIsRequestingAi(false);
    }
  };

  const handleMeasureClick = (event: React.MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
    if (activeTool !== "measure") return;

    const rect = event.currentTarget.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    const pctX = (clickX / rect.width) * 100;
    const pctY = (clickY / rect.height) * 100;

    let naturalW = 512;
    let naturalH = 512;
    if (imageRef.current) {
      naturalW = imageRef.current.naturalWidth || 512;
      naturalH = imageRef.current.naturalHeight || 512;
    } else {
      const canvas = event.currentTarget.querySelector("canvas");
      if (canvas) {
        naturalW = canvas.width || 512;
        naturalH = canvas.height || 512;
      }
    }

    const pixelX = (clickX / rect.width) * naturalW;
    const pixelY = (clickY / rect.height) * naturalH;

    const point: Point = { pixelX, pixelY, pctX, pctY };
    setMeasurePoints((previous) => (previous.length === 2 ? [point] : [...previous, point]));
  };

  return (
    <div className="space-y-4" data-medical-viewer="sanovia-ai">
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground flex gap-2 items-start">
        <ShieldCheck className="size-4 text-primary shrink-0 mt-0.5" />
        <span>{t.protectedAccess}</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        <aside className="rounded-xl border border-white/10 bg-surface/40 p-3 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold"><FileImage className="size-4 text-primary" /> {t.studies}</div>
          <div className="space-y-2 max-h-72 overflow-auto">
            {studies.length === 0 && <p className="text-xs text-muted-foreground">{t.noStudy}</p>}
            {studies.map((study) => (
              <button key={study.id} type="button" onClick={() => selectStudy(study)} className={`w-full text-left rounded-lg p-2 text-xs transition-colors ${selectedStudy?.id === study.id ? "bg-primary/15 text-primary" : "hover:bg-white/5"}`}>
                <div className="font-medium truncate">{study.description || t.studies}</div>
                <div className="text-muted-foreground mt-1">{study.studyDate || t.unknownStudyDate}</div>
              </button>
            ))}
          </div>
          {selectedStudy && (
            <div className="border-t border-white/10 pt-3 space-y-2">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{t.seriesLabel}</div>
              {selectedStudy.series.map((series) => (
                <button key={series.id} type="button" onClick={() => selectSeries(series)} className={`w-full text-left rounded-lg p-2 text-xs ${selectedSeries?.id === series.id ? "bg-primary/15 text-primary" : "hover:bg-white/5"}`}>
                  <span className="font-medium">{series.modality || "IMG"} </span>{series.description || t.seriesLabel}
                  <span className="block text-muted-foreground">{series.instances.length} {t.imagesCount}</span>
                </button>
              ))}
            </div>
          )}
        </aside>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {allInstances.map((instance) => {
            const isDicom = isDicomInstance(instance);
            return (
              <button key={instance.id} type="button" onClick={() => { setSelectedInstanceId(instance.id); setIsOpen(true); }} className="group relative aspect-square overflow-hidden rounded-xl border border-white/10 bg-surface/50 text-left hover:border-primary/50 transition-colors">
                {isDicom ? (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-black/40 text-emerald-400 group-hover:scale-105 transition-transform duration-300">
                    <ScanLine className="size-12 mb-2 opacity-80" />
                    <span className="text-[11px] font-mono tracking-wider font-semibold">SCANNER / CT</span>
                  </div>
                ) : (
                  <img src={getAuthUrl(instance, patientId)} alt={instance.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                )}
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-3 pt-8 text-xs text-white truncate">{instance.title}</span>
                {isDicom && <span className="absolute top-2 left-2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 text-[10px]">{t.dicomBadge}</span>}
              </button>
            );
          })}
          {!isReadOnly && (
            <label className={`aspect-square flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 bg-surface/30 text-muted-foreground hover:bg-surface/50 cursor-pointer ${isUploading ? "opacity-50 pointer-events-none" : ""}`}>
              <input type="file" accept="application/dicom,.dcm,image/*" className="hidden" onChange={handleUpload} disabled={isUploading} />
              {isUploading ? <Loader2 className="size-8 animate-spin" /> : <FileImage className="size-8 opacity-50" />}
              <span className="text-sm font-medium">{isUploading ? t.uploading : t.importStudy}</span>
            </label>
          )}
        </div>
      </div>

      <Dialog open={isOpen && Boolean(activeInstance)} onOpenChange={(open) => { setIsOpen(open); if (!open) resetView(); }}>
        <DialogContent hideCloseButton className="max-w-[100vw] w-screen h-screen bg-black border-none p-0 flex overflow-hidden rounded-none m-0">
          {activeInstance && (
            <TooltipProvider>
              <div className="flex w-full h-full min-w-0">
                <div className="w-16 bg-[#0a0a0a] border-r border-white/10 flex flex-col items-center py-4 gap-3 z-20">
                  <ScanLine className="size-6 text-primary mb-4" />
                  <ToolButton label={t.toolPan} active={activeTool === "pan"} onClick={() => setActiveTool("pan")}><MousePointer2 className="size-5" /></ToolButton>
                  <ToolButton label={t.toolMeasure} active={activeTool === "measure"} onClick={() => setActiveTool("measure")}><Ruler className="size-5" /></ToolButton>
                  <ToolButton label={t.toolInvert} active={invert} onClick={() => setInvert((value) => !value)}><Contrast className="size-5" /></ToolButton>
                  <ToolButton label={t.toolGrid} active={showGrid} onClick={() => setShowGrid((value) => !value)}><Grid3X3 className="size-5" /></ToolButton>
                  <ToolButton label={t.toolRotate} onClick={() => setRotation((value) => value + 90)}><RotateCw className="size-5" /></ToolButton>
                  <div className="h-px w-8 bg-white/10 my-2" />
                  <ToolButton label={t.toolAi} onClick={handleAiRequest} disabled={isRequestingAi}>{isRequestingAi ? <Loader2 className="size-5 animate-spin" /> : <Sparkles className="size-5" />}</ToolButton>
                </div>

                <div className="flex-1 relative overflow-hidden bg-black flex min-w-0">
                  <div className="flex-1 relative min-w-0">
                    {/* En-tête en flux normal : les boutons occupent leur propre colonne et ne peuvent plus recouvrir le texte. */}
                    <div className="absolute top-0 inset-x-0 p-4 flex items-start gap-3 z-40 pointer-events-none text-emerald-300 font-mono text-[10px] tracking-wider">
                      <div className="min-w-0 flex-1 pointer-events-none"><p>SANOVIA IMAGING VIEWER</p><p className="truncate">STUDY: {selectedStudy?.studyInstanceUID || selectedStudy?.id}</p><p className="truncate">SERIES: {selectedSeries?.seriesInstanceUID || selectedSeries?.id}</p></div>
                      <div className="min-w-0 text-right pointer-events-none"><p>{t.importedOn}: {activeInstance.date || selectedStudy?.studyDate || "—"}</p><p>INSTANCE: {activeInstance.instanceNumber ?? "—"}</p><p>CALIBRATION: {activeInstance.pixelSpacing ? "Pixel Spacing" : t.calibrationNA}</p></div>
                      <div className="shrink-0 flex items-center gap-2 pointer-events-auto z-50">
                        <Button type="button" variant="ghost" size="icon" title={t.btnDownload} className="text-white bg-black/50 border border-white/10 hover:bg-white/10" onClick={handleDownload}><Download className="size-4" /></Button>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon" 
                          title={t.btnClose} 
                          className="text-white bg-black/50 border border-white/10 hover:bg-white/10 hover:text-red-400 cursor-pointer" 
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setIsOpen(false);
                            resetView();
                          }}
                        >
                          <X className="size-5" />
                        </Button>
                      </div>
                    </div>

                    {showGrid && <div className="absolute inset-0 pointer-events-none z-10 opacity-20" style={{ backgroundImage: "linear-gradient(#00ff00 1px, transparent 1px), linear-gradient(90deg, #00ff00 1px, transparent 1px)", backgroundSize: "50px 50px" }} />}

                    <TransformWrapper initialScale={1} minScale={0.5} maxScale={8} centerOnInit wheel={{ step: 0.1 }} disabled={activeTool !== "pan"}>
                      {({ zoomIn, zoomOut, resetTransform }) => (
                        <>
                          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-1 p-1.5 rounded-full bg-black/70 border border-white/10 z-30">
                            <Button variant="ghost" size="icon" className="text-white rounded-full h-8 w-8" onClick={() => zoomOut()}><ZoomOut className="size-4" /></Button>
                            <Button variant="ghost" size="sm" className="text-white rounded-full h-8 px-4 text-xs" onClick={() => { resetTransform(); resetView(); }}>{t.reset}</Button>
                            <Button variant="ghost" size="icon" className="text-white rounded-full h-8 w-8" onClick={() => zoomIn()}><ZoomIn className="size-4" /></Button>
                          </div>
                          <TransformComponent wrapperStyle={{ width: "100%", height: "100%", cursor: activeTool === "pan" ? "grab" : "crosshair" }} contentStyle={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <div 
                              onClick={handleMeasureClick}
                              className={`relative h-full w-full flex items-center justify-center ${activeTool === "measure" ? "cursor-crosshair" : ""}`}
                            >
                              {activeIsDicom ? (
                                <div 
                                  className="w-full h-full flex items-center justify-center transition-transform"
                                  style={{ 
                                    transform: `rotate(${rotation}deg)`, 
                                    filter: `brightness(${brightness}%) contrast(${contrast}%) ${invert ? "invert(100%)" : ""}` 
                                  }}
                                >
                                  <DicomViewer url={getAuthUrl(activeInstance, patientId)} />
                                </div>
                              ) : (
                                <img ref={imageRef} src={getAuthUrl(activeInstance, patientId)} crossOrigin="anonymous" alt={activeInstance.title} draggable={false} className="select-none max-h-full max-w-full object-contain" style={{ transform: `rotate(${rotation}deg)`, filter: `brightness(${brightness}%) contrast(${contrast}%) ${invert ? "invert(100%)" : ""}` }} />
                              )}
                              {measurePoints.length > 0 && (
                                <svg className="absolute inset-0 w-full h-full pointer-events-none z-50" viewBox="0 0 100 100" preserveAspectRatio="none">
                                  <circle cx={measurePoints[0]!.pctX} cy={measurePoints[0]!.pctY} r="1.2" fill="#10b981" stroke="#ffffff" strokeWidth="0.3" />
                                  {measurePoints.length === 2 && (
                                    <>
                                      <circle cx={measurePoints[1]!.pctX} cy={measurePoints[1]!.pctY} r="1.2" fill="#10b981" stroke="#ffffff" strokeWidth="0.3" />
                                      <line x1={measurePoints[0]!.pctX} y1={measurePoints[0]!.pctY} x2={measurePoints[1]!.pctX} y2={measurePoints[1]!.pctY} stroke="#10b981" strokeWidth="0.6" strokeDasharray="1.5,1" />
                                      <g transform={`translate(${(measurePoints[0]!.pctX + measurePoints[1]!.pctX) / 2}, ${(measurePoints[0]!.pctY + measurePoints[1]!.pctY) / 2})`}>
                                        <rect x="-16" y="-4" width="32" height="8" rx="2" fill="#000000" fillOpacity="0.85" stroke="#10b981" strokeWidth="0.3" />
                                        <text x="0" y="1" fill="#10b981" fontSize="3.2" fontWeight="bold" fontFamily="monospace" textAnchor="middle" dominantBaseline="middle">
                                          {distanceInfo ? `${distanceInfo.isEstimated ? '~' : ''}${distanceInfo.value.toFixed(2)} mm` : t.calibrationUnavailable}
                                        </text>
                                      </g>
                                    </>
                                  )}
                                </svg>
                              )}
                            </div>
                          </TransformComponent>
                        </>
                      )}
                    </TransformWrapper>
                  </div>

                  <aside className="w-80 bg-[#0a0a0a] border-l border-white/10 p-5 flex flex-col z-20 overflow-y-auto">
                    {showAiPanel && aiResult ? (
                      <AiReportPanel result={aiResult} language={language} onClose={() => setShowAiPanel(false)} fallbackDisclaimer={t.disclaimer} />
                    ) : (
                      <>
                        <h3 className="text-white/80 font-medium text-sm mb-6 flex items-center gap-2 uppercase tracking-wider"><Settings2 className="size-4 text-primary" /> {t.displaySettings}</h3>
                        <div className="space-y-5">
                          <SliderField icon={<Sun className="size-3" />} label={t.brightness} value={brightness} min={20} max={200} onChange={setBrightness} />
                          <SliderField icon={<Contrast className="size-3" />} label={t.contrast} value={contrast} min={50} max={250} onChange={setContrast} />
                        </div>
                        <div className="mt-6 rounded-lg p-3 border border-amber-400/20 bg-amber-400/5 text-amber-200 text-[11px] leading-relaxed flex gap-2"><AlertTriangle className="size-4 shrink-0" /> {t.disclaimer}</div>
                        <div className="mt-4 rounded-lg p-3 border border-primary/20 bg-primary/5 text-primary/80 text-[11px] leading-relaxed flex gap-2"><Info className="size-4 shrink-0" /> {activeInstance.pixelSpacing ? t.measureAvailableMsg : t.measureDisabledMsg}</div>
                        <div className="mt-6 border-t border-white/10 pt-6"><h3 className="text-white/80 font-medium text-sm mb-4 flex items-center gap-2 uppercase tracking-wider"><Film className="size-4 text-primary" /> {t.compareMode}</h3><div className="space-y-2">{allInstances.filter((instance) => instance.id !== activeInstance.id).slice(0, 20).map((instance) => <button type="button" key={instance.id} onClick={() => setCompareInstanceId(compareInstanceId === instance.id ? null : instance.id)} className={`w-full flex items-center gap-2 p-2 rounded-lg text-left text-xs ${compareInstanceId === instance.id ? "bg-primary/20" : "bg-white/5 hover:bg-white/10"}`}>{isDicomInstance(instance) ? <div className="size-8 rounded bg-black/40 flex items-center justify-center text-emerald-400"><ScanLine className="size-4" /></div> : <img src={getAuthUrl(instance, patientId)} alt="" className="size-8 rounded object-cover" />}<span className="truncate text-white">{instance.title}</span></button>)}</div></div>
                      </>
                    )}
                  </aside>
                </div>
              </div>
            </TooltipProvider>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ToolButton({ label, active, disabled, onClick, children }: { label: string; active?: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return <Tooltip><TooltipTrigger asChild><Button type="button" variant="ghost" size="icon" aria-label={label} title={label} disabled={disabled} className={`text-white hover:bg-white/10 ${active ? "bg-primary/20 text-primary" : ""}`} onClick={onClick}>{children}</Button></TooltipTrigger><TooltipContent side="right" className="bg-zinc-800 text-white border-zinc-700">{label}</TooltipContent></Tooltip>;
}

function SliderField({ icon, label, value, min, max, onChange }: { icon: React.ReactNode; label: string; value: number; min: number; max: number; onChange: (value: number) => void }) {
  return <div className="space-y-3"><div className="flex items-center justify-between"><label className="text-xs text-white/60 flex items-center gap-2">{icon}{label}</label><span className="text-xs text-white/90 font-mono">{value}%</span></div><Slider value={[value]} min={min} max={max} step={1} onValueChange={(values) => onChange(values[0] ?? value)} /></div>;
}
