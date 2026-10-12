import React, { useState, useRef } from "react";
import { Patient } from "@/types";
import { SectionCard } from "@/components/shared/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Printer, Trash2, Pill, Activity, Syringe, MessageSquare, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ALL_MEDICATIONS, searchMedications } from "@/data/medications";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useAppState } from "@/hooks/use-app-state";
import jsPDF from "jspdf";

// Exemples de médicaments selon la spécialité
const SPECIALTY_CATALOGS = {
  general: [
    { id: "1", name: "Amoxicilline 1g", form: "Comprimés", defaultPosology: "1 comprimé matin et soir pendant 7 jours." },
    { id: "2", name: "Paracétamol 1000mg", form: "Comprimés", defaultPosology: "1 comprimé toutes les 6h en cas de douleur." },
    { id: "3", name: "Ibuprofène 400mg", form: "Comprimés", defaultPosology: "1 comprimé au cours du repas, max 3/jour." },
  ],
  dentist: [
    { id: "d1", name: "Amoxicilline 1g", form: "Comprimés", defaultPosology: "1 comprimé matin et soir pendant 7 jours." },
    { id: "d2", name: "Paracétamol 1000mg", form: "Comprimés", defaultPosology: "1 comprimé toutes les 6h en cas de douleur." },
    { id: "d3", name: "Ibuprofène 400mg", form: "Comprimés", defaultPosology: "1 comprimé au cours du repas, max 3/jour." },
    { id: "d4", name: "Bain de bouche (Chlorhexidine)", form: "Flacon", defaultPosology: "2 bains de bouche par jour après brossage." },
    { id: "d5", name: "Augmentin 1g/125mg", form: "Sachets", defaultPosology: "1 sachet matin, midi et soir pendant 6 jours." },
  ],
  opht: [
    { id: "o1", name: "Larmes artificielles", form: "Collyre", defaultPosology: "1 goutte dans chaque oeil 3 fois par jour." },
    { id: "o2", name: "Antibiotique local", form: "Collyre", defaultPosology: "1 goutte 4 fois par jour pendant 7 jours." },
    { id: "o3", name: "Anti-inflammatoire", form: "Collyre", defaultPosology: "1 goutte matin et soir." },
    { id: "o4", name: "Prescription Lunettes", form: "Ordonnance", defaultPosology: "Verres correcteurs selon réfraction." },
  ],
  cardio: [
    { id: "c1", name: "Aspirine 75mg", form: "Comprimés", defaultPosology: "1 comprimé le matin." },
    { id: "c2", name: "Bêta-bloquant", form: "Comprimés", defaultPosology: "1 comprimé par jour." },
    { id: "c3", name: "Statine", form: "Comprimés", defaultPosology: "1 comprimé le soir." },
  ],
  derma: [
    { id: "de1", name: "Crème hydratante", form: "Crème", defaultPosology: "Application locale 2 fois par jour." },
    { id: "de2", name: "Dermocorticoïde", form: "Pommade", defaultPosology: "1 application le soir sur les lésions." },
    { id: "de3", name: "Antibiotique local", form: "Gel", defaultPosology: "1 application le soir." },
  ],
  pedia: [
    { id: "p1", name: "Paracétamol sirop", form: "Sirop", defaultPosology: "1 dose poids toutes les 6 heures si fièvre." },
    { id: "p2", name: "Sérum Physiologique", form: "Doses", defaultPosology: "Lavage du nez avant chaque repas." },
    { id: "p3", name: "Amoxicilline sirop", form: "Sirop", defaultPosology: "1 dose poids 2 fois par jour pendant 6 jours." },
  ],
  gyneco: [
    { id: "g1", name: "Acide folique", form: "Comprimés", defaultPosology: "1 comprimé par jour." },
    { id: "g2", name: "Fer", form: "Comprimés", defaultPosology: "1 comprimé le matin à jeun." },
    { id: "g3", name: "Antispasmodique", form: "Comprimés", defaultPosology: "En cas de douleurs, max 6/jour." },
  ],
};

interface PrescriptionItem {
  id: string;
  name: string;
  form: string;
  posology: string;
}

export function PrescriptionGenerator({
  patient,
  tenant,
}: {
  patient: Patient;
  tenant: any; // On passe les infos du cabinet pour l'en-tête
}) {
  const { language } = useAppState();
  const [items, setItems] = useState<PrescriptionItem[]>([]);
  const [customMed, setCustomMed] = useState("");
  const [customPosology, setCustomPosology] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const filteredMeds = (customMed.length >= 2 
    ? searchMedications(customMed)
    : ALL_MEDICATIONS.slice(0, 50)
  ).map(m => ({
    id: m.id,
    name: m.name,
    form: m.forms?.[0] || "",
    defaultPosology: ""
  }));

  const specialtyRaw = tenant?.specialty?.toLowerCase() || "";
  let medCatalog = SPECIALTY_CATALOGS.general;

  if (specialtyRaw.includes("dent")) medCatalog = SPECIALTY_CATALOGS.dentist;
  else if (specialtyRaw.includes("opht")) medCatalog = SPECIALTY_CATALOGS.opht;
  else if (specialtyRaw.includes("cardio")) medCatalog = SPECIALTY_CATALOGS.cardio;
  else if (specialtyRaw.includes("derma")) medCatalog = SPECIALTY_CATALOGS.derma;
  else if (specialtyRaw.includes("pedia") || specialtyRaw.includes("pédia")) medCatalog = SPECIALTY_CATALOGS.pedia;
  else if (specialtyRaw.includes("gyn")) medCatalog = SPECIALTY_CATALOGS.gyneco;

  const addFromCatalog = (med: typeof medCatalog[0]) => {
    setItems((prev) => [...prev, { id: crypto.randomUUID(), name: med.name, form: med.form, posology: med.defaultPosology }]);
  };

  const addCustom = () => {
    if (!customMed) return;
    setItems((prev) => [...prev, { id: crypto.randomUUID(), name: customMed, form: "", posology: customPosology }]);
    setCustomMed("");
    setCustomPosology("");
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };



  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const savePrescriptionToBackend = async () => {
    if (items.length === 0) return;
    try {
      await api.post("/prescriptions", {
        patientId: patient.id,
        items: items.map(({ name, form, posology }) => ({ name, form, posology })),
        doctorName: tenant?.ownerName || tenant?.name || "",
        cabinetName: tenant?.name || "",
        specialty: tenant?.specialty || "",
      });
    } catch (err) {
      // Silent fail — print still works even if save fails
      console.warn("[PrescriptionGenerator] Backend save failed:", err);
    }
  };

  const handlePrint = async () => {
    setIsSaving(true);
    try {
      await savePrescriptionToBackend();
    } finally {
      setIsSaving(false);
    }

    // Isolate printing to just the prescription preview
    const printElement = document.getElementById("prescription-preview");
    if (!printElement) {
      toast.error("Erreur: Aperçu introuvable");
      return;
    }

    const printWindow = window.open("", "_blank", "width=800,height=800");
    if (!printWindow) {
      toast.error("Veuillez autoriser les pop-ups pour imprimer.");
      return;
    }

    // Get Tailwind CSS styles (assuming they are injected in head)
    const styles = Array.from(document.styleSheets)
      .map(styleSheet => {
        try {
          return Array.from(styleSheet.cssRules)
            .map(rule => rule.cssText)
            .join("");
        } catch (e) {
          return "";
        }
      })
      .join("");

    printWindow.document.write(`
      <html>
        <head>
          <title>Ordonnance - ${patient.firstName} ${patient.lastName}</title>
          <style>
            ${styles}
            @page { size: A4; margin: 20mm; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white; }
          </style>
        </head>
        <body>
          ${printElement.outerHTML}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
      printWindow.print();
      printWindow.onafterprint = () => printWindow.close();
    }, 500);

    toast.success("Ordonnance sauvegardée et imprimée !");
  };

  const handleWhatsAppShare = async () => {
    if (items.length === 0) {
      toast.error("Veuillez ajouter au moins un médicament.");
      return;
    }

    setIsSendingWhatsApp(true);
    try {
      // 1. Generate text fallback
      let text = `*Ordonnance Médicale*\n_Dr. ${tenant?.ownerName || tenant?.name || "Médecin"}_
*Patient(e)* : ${patient.firstName} ${patient.lastName}

`;
      items.forEach((item, index) => {
        text += `${index + 1}. *${item.name}* ${item.form ? `(${item.form})` : ""}\n`;
        if (item.posology) text += `   Posologie : ${item.posology}\n`;
      });
      text += `
_Généré le ${new Date().toLocaleDateString("fr-FR")}_`;

      // 2. Generate PDF natively with jsPDF (no HTML parsing, so no oklch crash)
      const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
      
      // En-tête
      doc.setFontSize(20);
      doc.text(tenant?.name || "Cabinet Médical", 20, 20);
      doc.setFontSize(12);
      doc.text(tenant?.ownerName || "Dr. Médecin", 20, 28);
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(tenant?.specialty || "Spécialité", 20, 34);
      
      doc.setFontSize(10);
      doc.text(tenant?.address || "Adresse", 130, 20);
      doc.text(`Tél : ${tenant?.phone || "—"}`, 130, 26);
      
      // Patient & Date
      doc.setTextColor(0);
      doc.setFontSize(14);
      doc.text(`Patient(e) : ${patient.firstName} ${patient.lastName}`, 20, 50);
      
      doc.setFontSize(10);
      doc.text(`Fait le : ${new Date().toLocaleDateString("fr-FR")}`, 130, 50);
      
      // Titre
      doc.setFontSize(18);
      doc.text("ORDONNANCE", 105, 70, { align: "center" });
      
      // Items
      let y = 90;
      doc.setFontSize(12);
      items.forEach((item, index) => {
        doc.setFont("helvetica", "bold");
        doc.text(`${index + 1}. ${item.name} ${item.form ? `(${item.form})` : ""}`, 20, y);
        y += 6;
        if (item.posology) {
          doc.setFont("helvetica", "normal");
          doc.setTextColor(80);
          doc.text(item.posology, 25, y);
          y += 8;
          doc.setTextColor(0);
        } else {
          y += 4;
        }
      });
      
      // Signature
      doc.setFontSize(10);
      doc.text("Signature du médecin :", 130, y + 20);
      
      // Obtenir la dataUri base64 sans le prefixe data:application/pdf;base64,
      const pdfDataUri = doc.output('datauristring');
      const base64 = pdfDataUri.split(',')[1];

      // 3. Send via API
      await api.post(`/communications/patients/${patient.id}/send`, { 
        content: text,
        document: {
          base64,
          filename: `Ordonnance_${patient.lastName}.pdf`,
          mimeType: "application/pdf"
        }
      });
      toast.success("Ordonnance PDF envoyée par WhatsApp !");
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'envoi WhatsApp.");
    } finally {
      setIsSendingWhatsApp(false);
    }
  };


  const today = new Date().toLocaleDateString(language === "ar" ? "ar-TN" : language === "en" ? "en-GB" : "fr-FR", { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* SECTION GAUCHE : Générateur (Masqué à l'impression) */}
      <div className="flex-1 space-y-6 print:hidden">
        <SectionCard 
          title={language === "ar" ? "إنشاء وصفة طبية" : language === "en" ? "Create Prescription" : "Créer une Ordonnance"} 
          description={language === "ar" ? "اختر أو أضف أدوية." : language === "en" ? "Select or add medications." : "Sélectionnez ou ajoutez des médicaments."}
          className="overflow-visible"
        >
          
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">{language === "ar" ? "البحث عن دواء" : language === "en" ? "Search Medication" : "Rechercher un Médicament"}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5 relative">
                <label className="text-xs font-semibold">{language === "ar" ? "اسم الدواء" : language === "en" ? "Medication name" : "Nom du Médicament"}</label>
                <Input 
                  placeholder={language === "ar" ? "مثال: أموكسيسيلين 500mg" : language === "en" ? "Ex: Clamoxyl 500mg" : "Ex: Clamoxyl 500mg"} 
                  value={customMed} 
                  onChange={(e) => setCustomMed(e.target.value)}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                />
                
                {/* Autocomplete Dropdown */}
                {showSuggestions && filteredMeds.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl z-[100] max-h-64 overflow-y-auto ring-1 ring-black/5 divide-y divide-slate-100">
                    {filteredMeds.map((med: any) => (
                      <div 
                        key={med.id} 
                        className="p-3 text-sm cursor-pointer hover:bg-slate-50 transition-colors flex flex-col gap-1"
                        onMouseDown={(e) => e.preventDefault()} // Prevent blur from firing before click
                        onClick={() => {
                          setCustomMed(med.name);
                          if (!customPosology) setCustomPosology(med.defaultPosology || "");
                          setShowSuggestions(false);
                        }}
                      >
                        <div className="font-bold text-slate-800 flex items-center gap-2">
                          <Pill className="size-4 text-primary" />
                          {med.name}
                        </div>
                        <div className="text-xs font-medium text-slate-500 pl-6">
                          {med.form}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">{language === "ar" ? "الجرعة (اختياري)" : language === "en" ? "Dosage (Optional)" : "Posologie (Optionnel)"}</label>
                <Input placeholder={language === "ar" ? "مثال: كبسولة واحدة صباحاً" : language === "en" ? "Ex: 1 capsule in the morning" : "Ex: 1 gélule le matin"} value={customPosology} onChange={(e) => setCustomPosology(e.target.value)} />
              </div>
            </div>
            <Button onClick={addCustom} disabled={!customMed} className="w-full sm:w-auto" variant="secondary">
              <Plus className="size-4 mr-2" />{language === "ar" ? "إضافة للوصفة" : language === "en" ? "Add to prescription" : "Ajouter à l'ordonnance"}</Button>
          </div>

        </SectionCard>
      </div>

      {/* SECTION DROITE : Aperçu A4 (Seule partie visible à l'impression) */}
      <div className="w-full lg:w-[45%] xl:w-[40%] flex flex-col gap-4">
        <div className="flex items-center justify-between print:hidden">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">{language === "ar" ? "معاينة PDF" : language === "en" ? "PDF Preview" : "Aperçu PDF"}</h3>
          <div className="flex items-center gap-2">
            <Button onClick={handleWhatsAppShare} disabled={items.length === 0 || isSendingWhatsApp} variant="outline" className="text-green-600 border-green-600 hover:bg-green-50">
              {isSendingWhatsApp ? <Loader2 className="size-4 mr-2 animate-spin" /> : <MessageSquare className="size-4 mr-2" />}
              WhatsApp
            </Button>
            <Button onClick={handlePrint} disabled={items.length === 0}>
              <Printer className="size-4 mr-2" />{language === "ar" ? "طباعة / PDF" : language === "en" ? "Print / PDF" : "Imprimer / PDF"}</Button>
          </div>
        </div>

        {/* CONTAINER PAPIER */}
        <div className="bg-white text-black shadow-lg border rounded-xl overflow-hidden print:shadow-none print:border-none print:rounded-none">
          {/* L'ordonnance elle-même - Configuration A4 */}
          <div id="prescription-preview" className="p-8 md:p-10 min-h-[500px] flex flex-col relative print:p-0 print:w-full">
            
            {/* Header Cabinet */}
            <div className="flex justify-between items-start border-b-2 border-slate-200 pb-6 mb-8">
              <div>
                <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">{tenant?.name || "Cabinet Médical"}</h1>
                <h2 className="text-lg font-bold text-slate-600 mt-1">{tenant?.ownerName || "Dr. Médecin"}</h2>
                <p className="text-sm text-slate-500 font-medium">{tenant?.specialty || "Spécialiste"}</p>
              </div>
              <div className="text-right text-xs text-slate-500 font-medium space-y-0.5 mt-1">
                <p>{tenant?.address || "123 Avenue de la Santé, Paris"}</p>
                <p>Tél : {tenant?.phone || "+33 1 23 45 67 89"}</p>
                <p>Email : {tenant?.ownerEmail || "contact@cabinet.com"}</p>
              </div>
            </div>

            {/* Info Patient & Date */}
            <div className="flex justify-between items-end mb-10">
              <div className="space-y-1">
                <p className="text-sm text-slate-500 font-semibold uppercase tracking-wider">{language === "ar" ? "المريض/المريضة" : language === "en" ? "Patient" : "Patient(e)"}</p>
                <p className="text-lg font-bold text-slate-800">{patient.firstName} {patient.lastName}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-slate-600">{language === "ar" ? "بتاريخ: " : language === "en" ? "Date: " : "Fait le : "}<span className="font-bold">{today}</span></p>
              </div>
            </div>

            <h3 className="text-center text-xl font-black uppercase tracking-[0.2em] text-slate-800 mb-10 border-b border-slate-200 inline-block self-center pb-1">{language === "ar" ? "وصفة طبية" : language === "en" ? "PRESCRIPTION" : "Ordonnance"}</h3>

            {/* Liste des médicaments */}
            <div className="flex-1 space-y-6">
              {items.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-300 italic text-sm print:hidden">
                  {language === "ar" ? "الوصفة فارغة. أضف أدوية." : language === "en" ? "The prescription is empty. Add medications." : "L'ordonnance est vide. Ajoutez des médicaments."}
                </div>
              ) : (
                items.map((item, index) => (
                  <div key={item.id} className="group flex justify-between items-start pr-2">
                    <div>
                      <p className="text-base font-bold text-slate-800">
                        {index + 1}. {item.name} {item.form && <span className="font-normal text-sm text-slate-500">({item.form})</span>}
                      </p>
                      {item.posology && <p className="text-sm font-medium text-slate-600 mt-1 pl-4 border-l-2 border-slate-300">{item.posology}</p>}
                    </div>
                    
                    {/* Bouton supprimer (caché à l'impression) */}
                    <button 
                      onClick={() => removeItem(item.id)}
                      className="text-rose-400 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity print:hidden mt-1 p-1 bg-rose-50 rounded-md"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Footer Signature */}
            <div className="mt-16 pt-10 flex justify-end">
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-500 mb-12">{language === "ar" ? "توقيع الطبيب" : language === "en" ? "Doctor's signature" : "Signature du médecin"}</p>
                <div className="w-40 border-b border-slate-400 border-dashed"></div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
