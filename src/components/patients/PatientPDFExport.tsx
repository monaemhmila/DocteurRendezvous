import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { IPatient, IAppointment } from "@/types/api";

interface PatientPDFExportProps {
  patient: IPatient;
}

export function PatientPDFExport({ patient }: PatientPDFExportProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      const [apptsRes, prescriptionsRes] = await Promise.all([
        api.get(`/appointments?patientId=${patient._id}&limit=100`).catch(() => ({ data: [] })),
        api.get(`/prescriptions?patientId=${patient._id}&limit=50`).catch(() => ({ data: [] })),
      ]);
      const appointments: IAppointment[] = Array.isArray(apptsRes) ? apptsRes : (apptsRes?.data || []);
      const prescriptions: any[] = prescriptionsRes?.data || [];
      const notes: any[] = [];

      const fullName = `${patient.firstName} ${patient.lastName}`;
      const today = new Date().toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" });
      const dob = patient.dateOfBirth
        ? new Date(patient.dateOfBirth).toLocaleDateString("fr-FR")
        : "Non renseigné";

      const age = patient.dateOfBirth
        ? Math.floor((Date.now() - new Date(patient.dateOfBirth).getTime()) / (365.25 * 24 * 3600 * 1000))
        : null;

      // Build HTML content for the PDF
      const htmlContent = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1a1a2e; font-size: 11px; line-height: 1.5; padding: 0; }
    
    .header { background: linear-gradient(135deg, #0f3460 0%, #16213e 100%); color: white; padding: 28px 36px; display: flex; justify-content: space-between; align-items: flex-start; }
    .header-title { font-size: 22px; font-weight: 700; letter-spacing: -0.5px; }
    .header-sub { font-size: 11px; opacity: 0.7; margin-top: 3px; }
    .header-meta { text-align: right; font-size: 10px; opacity: 0.8; }
    .header-meta strong { display: block; font-size: 13px; opacity: 1; margin-bottom: 2px; }
    
    .patient-banner { background: #f0f4ff; border-left: 4px solid #0f3460; padding: 16px 36px; display: flex; gap: 40px; align-items: center; }
    .patient-avatar { width: 52px; height: 52px; border-radius: 50%; background: #0f3460; color: white; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 700; flex-shrink: 0; }
    .patient-info h2 { font-size: 18px; font-weight: 700; color: #0f3460; }
    .patient-info .meta { display: flex; gap: 20px; margin-top: 4px; color: #555; font-size: 10.5px; }
    .patient-info .meta span { display: flex; align-items: center; gap: 4px; }
    
    .status-badge { display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 9.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
    .status-active { background: #d1fae5; color: #065f46; }
    .status-inactive { background: #fee2e2; color: #991b1b; }
    .status-at_risk { background: #fef3c7; color: #92400e; }
    
    .content { padding: 20px 36px; }
    
    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
    .stat-box { background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 14px; text-align: center; }
    .stat-box .num { font-size: 22px; font-weight: 800; color: #0f3460; }
    .stat-box .label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; margin-top: 2px; }
    
    .section { margin-bottom: 20px; }
    .section-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #0f3460; border-bottom: 2px solid #0f3460; padding-bottom: 5px; margin-bottom: 10px; }
    
    table { width: 100%; border-collapse: collapse; font-size: 10.5px; }
    th { background: #0f3460; color: white; padding: 7px 10px; text-align: left; font-weight: 600; font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.5px; }
    td { padding: 7px 10px; border-bottom: 1px solid #f0f0f0; vertical-align: top; }
    tr:nth-child(even) td { background: #f9fafb; }
    
    .appt-status { display: inline-block; padding: 2px 7px; border-radius: 10px; font-size: 9px; font-weight: 600; }
    .appt-confirmed { background: #d1fae5; color: #065f46; }
    .appt-completed { background: #dbeafe; color: #1e40af; }
    .appt-scheduled { background: #fef9c3; color: #854d0e; }
    .appt-cancelled { background: #fee2e2; color: #991b1b; }
    .appt-no_show { background: #f3e8ff; color: #6b21a8; }
    
    .notes-box { background: #fafafa; border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px 14px; white-space: pre-wrap; font-size: 10.5px; line-height: 1.6; color: #374151; min-height: 60px; }
    .empty-note { color: #9ca3af; font-style: italic; }
    
    .prescription-item { background: white; border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px 14px; margin-bottom: 8px; }
    .prescription-item .drug { font-weight: 700; font-size: 11px; color: #0f3460; }
    .prescription-item .pos { color: #555; margin-top: 2px; }
    
    .footer { margin-top: 30px; padding-top: 12px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; color: #9ca3af; font-size: 9px; }
    .signature-line { text-align: right; }
    .signature-line .line { border-top: 1px solid #374151; width: 160px; margin-left: auto; margin-top: 30px; }
    .signature-line .sig-label { font-size: 9px; color: #6b7280; margin-top: 4px; }
    
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>

<div class="header">
  <div>
    <div class="header-title">🏥 Dossier Médical Patient</div>
    <div class="header-sub">Document confidentiel — Usage médical uniquement</div>
  </div>
  <div class="header-meta">
    <strong>Généré le ${today}</strong>
    Réf: DOC-${patient._id.slice(-6).toUpperCase()}
  </div>
</div>

<div class="patient-banner">
  <div class="patient-avatar">${(patient.firstName[0] || "").toUpperCase()}${(patient.lastName[0] || "").toUpperCase()}</div>
  <div class="patient-info">
    <h2>${fullName}</h2>
    <div class="meta">
      <span>📅 Né(e) le: <strong>${dob}${age ? ` (${age} ans)` : ""}</strong></span>
      <span>📱 Tél: <strong>${patient.phone || "—"}</strong></span>
      ${patient.email ? `<span>✉️ Email: <strong>${patient.email}</strong></span>` : ""}
      <span>Statut: <span class="status-badge status-${patient.status}">${patient.status === "active" ? "Actif" : patient.status === "at_risk" ? "À risque" : patient.status === "inactive" ? "Inactif" : patient.status}</span></span>
    </div>
  </div>
</div>

<div class="content">

  <!-- Stats -->
  <div class="stats-grid">
    <div class="stat-box">
      <div class="num">${patient.metrics?.totalVisits ?? 0}</div>
      <div class="label">Visites totales</div>
    </div>
    <div class="stat-box">
      <div class="num">${appointments.filter((a) => a.status === "completed" || a.status === "confirmed").length}</div>
      <div class="label">RDV honorés</div>
    </div>
    <div class="stat-box">
      <div class="num">${patient.metrics?.noShowCount ?? 0}</div>
      <div class="label">No-shows</div>
    </div>
    <div class="stat-box">
      <div class="num">${patient.metrics?.revenue ? patient.metrics.revenue.toFixed(0) + " DT" : "—"}</div>
      <div class="label">Valeur patient</div>
    </div>
  </div>

  <!-- Appointments History -->
  <div class="section">
    <div class="section-title">📅 Historique des Rendez-vous (${appointments.length})</div>
    ${
      appointments.length === 0
        ? '<p class="empty-note">Aucun rendez-vous enregistré.</p>'
        : `<table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Heure</th>
            <th>Traitement</th>
            <th>Statut</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          ${appointments
            .sort((a, b) => b.date.localeCompare(a.date))
            .slice(0, 30)
            .map(
              (a) => `
            <tr>
              <td>${new Date(a.date).toLocaleDateString("fr-FR")}</td>
              <td>${a.startTime || "—"}${a.endTime ? ` – ${a.endTime}` : ""}</td>
              <td>${a.treatment || "—"}</td>
              <td><span class="appt-status appt-${a.status}">${
                { scheduled: "Planifié", confirmed: "Confirmé", completed: "Terminé", cancelled: "Annulé", no_show: "No-show" }[a.status] || a.status
              }</span></td>
              <td>${a.notes ? a.notes.slice(0, 60) + (a.notes.length > 60 ? "..." : "") : "—"}</td>
            </tr>`
            )
            .join("")}
        </tbody>
      </table>`
    }
  </div>

  <!-- Prescriptions -->
  <div class="section">
    <div class="section-title">💊 Dernières Ordonnances (${prescriptions.length})</div>
    ${
      prescriptions.length === 0
        ? '<p class="empty-note">Aucune ordonnance enregistrée.</p>'
        : prescriptions
            .slice(0, 5)
            .map(
              (rx) => `
      <div class="prescription-item" style="border-left: 3px solid #0f3460; margin-bottom: 12px;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f0f0f0; padding-bottom: 6px; margin-bottom: 6px;">
            <div class="drug" style="font-size: 12px;">📅 ${new Date(rx.createdAt || "").toLocaleDateString("fr-FR")} — <span style="color:#555; font-weight:normal;">Dr. ${rx.doctorName || "Médecin"}</span></div>
            ${rx.diagnosis ? `<div style="font-size: 10px; background: #f0f4ff; padding: 2px 6px; border-radius: 4px; color: #0f3460;">Diagnostic: ${rx.diagnosis}</div>` : ""}
        </div>
        <div style="padding-left: 8px;">
            ${(rx.items || []).map((i: any) => `
                <div style="margin-bottom: 4px;">
                    <strong style="color: #1a1a2e;">${i.name}</strong> <span style="color: #666; font-size: 9px;">${i.form ? `(${i.form})` : ""}</span><br/>
                    ${i.posology ? `<span style="color: #444; font-size: 10px; margin-left: 8px;">↳ ${i.posology}</span>` : ""}
                </div>
            `).join("")}
        </div>
        ${rx.notes ? `<div style="margin-top: 6px; padding: 6px; background: #fdfdfd; border: 1px dashed #ccc; font-size: 9.5px; color: #555;">📝 ${rx.notes}</div>` : ""}
      </div>`
            )
            .join("")
    }
  </div>

  <!-- Clinical Notes -->
  <div class="section">
    <div class="section-title">📝 Notes Cliniques</div>
    ${
      notes.length === 0
        ? `<div class="notes-box"><span class="empty-note">${patient.notes || "Aucune note clinique."}</span></div>`
        : notes
            .slice(0, 3)
            .map(
              (n) => `
      <div class="notes-box" style="margin-bottom:8px">
        <strong style="font-size:10px;color:#0f3460">${new Date(n.createdAt || "").toLocaleDateString("fr-FR")}</strong><br/>
        ${n.content || n.notes || "—"}
      </div>`
            )
            .join("")
    }
  </div>

  <!-- Footer -->
  <div class="footer">
    <div>
      <div>Ce document est généré automatiquement par le Système de Gestion Médicale.</div>
      <div>Confidentiel · RGPD/HIPAA · ${today}</div>
    </div>
    <div class="signature-line">
      <div class="line"></div>
      <div class="sig-label">Signature & Cachet du Médecin</div>
    </div>
  </div>

</div>
</body>
</html>`;

      // ── Print approach: avoids html2canvas oklch incompatibility ────────
      // Opens self-contained HTML (hex-only colors) in a new window and
      // triggers the browser's built-in print/save-as-PDF dialog.
      const printReadyHtml = htmlContent.replace(
        "<head>",
        `<head>
  <title>Dossier ${fullName}</title>
  <style>
    @page { size: A4; margin: 0; }
    @media print {
      html, body { width: 210mm; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>`
      );

      const printWindow = window.open("", "_blank", "width=900,height=700");
      if (!printWindow) {
        toast.error("Veuillez autoriser les pop-ups pour générer le PDF.");
        setIsGenerating(false);
        return;
      }
      printWindow.document.write(printReadyHtml);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.onafterprint = () => printWindow.close();
      }, 600);

      toast.success(`Dossier de ${fullName} prêt — choisissez "Enregistrer en PDF" dans la fenêtre d'impression !`);
    } catch (err) {
      console.error("PDF generation error:", err);
      toast.error("Erreur lors de la génération du PDF. Veuillez réessayer.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={generatePDF}
      disabled={isGenerating}
      className="flex items-center gap-2"
    >
      {isGenerating ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <FileDown className="size-4" />
      )}
      {isGenerating ? "Génération..." : "Exporter PDF"}
    </Button>
  );
}
