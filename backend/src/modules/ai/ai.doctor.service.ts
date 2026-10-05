import mongoose from "mongoose";
import { Conversation, Message } from "../communications/communication.model";
import { Tenant } from "../tenants/tenant.model";
import { Appointment } from "../appointments/appointment.model";
import { Patient } from "../patients/patient.model";
import { OpenAICompatibleProvider } from "./openai-compatible.provider";
import { buildDoctorSystemPrompt } from "./ai.doctor.prompt";

const aiProvider = new OpenAICompatibleProvider();

class AIDoctorService {
  /**
   * Main entry point for the Doctor's personal AI assistant via WhatsApp.
   */
  public async processDoctorMessage(
    tenantId: string,
    conversationId: string,
    inboundWaId?: string
  ): Promise<void> {
    console.log(`[AI Doctor] Processing message in conversation ${conversationId}`);

    const conversation = await Conversation.findById(conversationId).lean();
    if (!conversation) return;

    // Load recent messages
    const recentMsgs = await Message.find({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      conversationId: new mongoose.Types.ObjectId(conversationId),
    }).sort({ createdAt: -1 }).limit(10).lean();

    const messages = recentMsgs.reverse().map(m => ({
      role: m.direction === "inbound" ? "user" : "assistant",
      content: m.content
    }));

    // Fetch tenant services for pricing resolution
    const tenantDoc = await Tenant.findById(tenantId).lean();
    const services = tenantDoc?.settings?.services || [];

    const resolvePrice = (a: any): number => {
      if (typeof a.price === "number" && a.price >= 0) return a.price;
      if (typeof a.value === "number" && a.value >= 0) return a.value;
      if (a.treatment) {
        const match = services.find((s: any) => s.name?.toLowerCase().trim() === a.treatment?.toLowerCase().trim());
        if (match?.price) return Number(match.price);
      }
      return 60;
    };

    // Build context
    const context = { scheduleData: "", revenueData: "" };

    // Inject schedule and revenue for today
    const today = new Date().toISOString().split("T")[0];
    const todayAppointments = await Appointment.find({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      date: today,
      status: { $in: ["scheduled", "confirmed", "completed"] }
    }).sort({ startTime: 1 }).populate("patientId", "firstName lastName").lean();

    if (todayAppointments.length > 0) {
      let todayTotalRev = 0;
      const lines = todayAppointments.map((a: any) => {
        const p = resolvePrice(a);
        todayTotalRev += p;
        const statusLabel = a.status === "completed" ? "Terminé" : a.status === "confirmed" ? "Confirmé" : "Prévu";
        return `- ${a.startTime} : ${a.patientId?.firstName || "Patient"} ${a.patientId?.lastName || ""} (${a.treatment}) — ${p} DT [${statusLabel}]`;
      });
      context.scheduleData = lines.join("\n") + `\n\n💰 Total estimé du jour : ${todayTotalRev} DT (${todayAppointments.length} RDV)`;
      context.revenueData = `Total estimé aujourd'hui : ${todayTotalRev} DT sur ${todayAppointments.length} rendez-vous.`;
    } else {
      context.scheduleData = "Aucun rendez-vous aujourd'hui.";
      context.revenueData = "Aucun rendez-vous ni recette prévus aujourd'hui.";
    }

    const systemPrompt = buildDoctorSystemPrompt(context);

    const fullMessages = [{ role: "system", content: systemPrompt }, ...messages];

    // Call AI
    const rawResponse = await aiProvider.generateCompletion(fullMessages as any);
    let result;
    try {
      const cleanJson = rawResponse.replace(/```json/g, "").replace(/```/g, "").trim();
      result = JSON.parse(cleanJson);
    } catch (e) {
      console.error("[AI Doctor] Failed to parse AI JSON:", rawResponse);
      await this.sendReply(tenantId, conversationId, "Désolé Docteur, je n'ai pas compris (Erreur JSON).", inboundWaId);
      return;
    }

    let finalReply = result.reply;

    // Execute Actions
    if (result.action?.type === "get_schedule") {
      const targetDate = result.action.date || today;
      let scheduleText = context.scheduleData;

      if (targetDate !== today) {
        const targetAppointments = await Appointment.find({
          tenantId: new mongoose.Types.ObjectId(tenantId),
          date: targetDate,
          status: { $in: ["scheduled", "confirmed", "completed"] }
        }).sort({ startTime: 1 }).populate("patientId", "firstName lastName").lean();

        if (targetAppointments.length > 0) {
          let dayRev = 0;
          const lines = targetAppointments.map((a: any) => {
            const p = resolvePrice(a);
            dayRev += p;
            const statusLabel = a.status === "completed" ? "Terminé" : a.status === "confirmed" ? "Confirmé" : "Prévu";
            return `- ${a.startTime} : ${a.patientId?.firstName || "Patient"} ${a.patientId?.lastName || ""} (${a.treatment}) — ${p} DT [${statusLabel}]`;
          });
          scheduleText = lines.join("\n") + `\n\n💰 Total estimé : ${dayRev} DT (${targetAppointments.length} RDV)`;
        } else {
          scheduleText = "Aucun rendez-vous pour cette date.";
        }
      }

      finalReply = `Voici votre programme pour le ${targetDate} :\n\n${scheduleText}`;
    } else if (result.action?.type === "get_revenue") {
      const period = result.action.period || "today";
      let dateFrom = today;
      let dateTo = today;
      let periodLabel = `aujourd'hui (${today})`;

      if (period === "tomorrow") {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        dateFrom = d.toISOString().split("T")[0];
        dateTo = dateFrom;
        periodLabel = `demain (${dateFrom})`;
      } else if (period === "week") {
        const d = new Date();
        const dayOfWeek = (d.getDay() + 6) % 7; // Monday = 0
        const start = new Date(d);
        start.setDate(d.getDate() - dayOfWeek);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        dateFrom = start.toISOString().split("T")[0];
        dateTo = end.toISOString().split("T")[0];
        periodLabel = `cette semaine (du ${dateFrom} au ${dateTo})`;
      } else if (period === "month") {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        dateFrom = `${year}-${month}-01`;
        const lastDay = new Date(year, d.getMonth() + 1, 0).getDate();
        dateTo = `${year}-${month}-${String(lastDay).padStart(2, "0")}`;
        periodLabel = `ce mois (${month}/${year})`;
      } else if (result.action.date) {
        dateFrom = result.action.date;
        dateTo = result.action.date;
        periodLabel = `le ${result.action.date}`;
      }

      const targetAppointments = await Appointment.find({
        tenantId: new mongoose.Types.ObjectId(tenantId),
        date: { $gte: dateFrom, $lte: dateTo },
        status: { $in: ["scheduled", "confirmed", "completed"] }
      }).sort({ date: 1, startTime: 1 }).populate("patientId", "firstName lastName").lean();

      if (targetAppointments.length === 0) {
        finalReply = `📊 Aucun rendez-vous ni encaissement prévu pour ${periodLabel}.`;
      } else {
        let totalRev = 0;
        let completedRev = 0;
        let confirmedRev = 0;
        let scheduledRev = 0;

        const lines = targetAppointments.map((a: any) => {
          const p = resolvePrice(a);
          totalRev += p;
          if (a.status === "completed") completedRev += p;
          else if (a.status === "confirmed") confirmedRev += p;
          else scheduledRev += p;

          const datePrefix = (dateFrom !== dateTo) ? `[${a.date}] ` : "";
          const statusIcon = a.status === "completed" ? "✅" : a.status === "confirmed" ? "🟢" : "⏳";
          return `- ${datePrefix}${a.startTime} : ${a.patientId?.firstName || "Patient"} ${a.patientId?.lastName || ""} (${a.treatment}) — ${p} DT ${statusIcon}`;
        });

        finalReply = `📊 *Bilan Financier & Recettes (${periodLabel})* :\n\n` +
          `💰 *Total prévisionnel : ${totalRev} DT* (${targetAppointments.length} RDV)\n` +
          (completedRev > 0 ? `✅ Déjà terminés / encaissés : ${completedRev} DT\n` : "") +
          (confirmedRev > 0 ? `🟢 Confirmés : ${confirmedRev} DT\n` : "") +
          (scheduledRev > 0 ? `⏳ En attente / prévus : ${scheduledRev} DT\n` : "") +
          `\n*Détail des consultations :*\n` +
          lines.join("\n");
      }
    } else if (result.action?.type === "cancel_appointment") {
      const timeToCancel = result.action.time;
      const targetDate = result.action.date || today;
      
      if (timeToCancel) {
        const targetAppointments = await Appointment.find({
          tenantId: new mongoose.Types.ObjectId(tenantId),
          date: targetDate,
          status: { $in: ["scheduled", "confirmed"] }
        }).populate("patientId", "firstName lastName").lean();

        const apptToCancel = targetAppointments.find(a => a.startTime === timeToCancel);
        if (apptToCancel) {
          await Appointment.findByIdAndUpdate(apptToCancel._id, { status: "cancelled" });
          finalReply = `Le rendez-vous de ${timeToCancel} le ${targetDate} (${(apptToCancel as any).patientId?.firstName}) a été annulé avec succès.`;
        } else {
          finalReply = `Je n'ai pas trouvé de rendez-vous à ${timeToCancel} le ${targetDate} pour l'annuler.`;
        }
      }
    } else if (result.action?.type === "block_slots") {
      const targetDate = result.action.date || today;
      const startTime = result.action.time;
      const endTime = result.action.endTime;
      
      if (startTime && endTime) {
        // Find or create dummy patient for blocking
        let blockPatient = await Patient.findOne({ tenantId: new mongoose.Types.ObjectId(tenantId), phone: "00000000" });
        if (!blockPatient) {
          blockPatient = await Patient.create({
            tenantId: new mongoose.Types.ObjectId(tenantId),
            phone: "00000000",
            firstName: "Indisponible",
            lastName: "(Bloqué)",
            language: "fr",
            status: "lead"
          });
        }
        
        // Find doctorId
        const User = mongoose.model("User");
        const doctors = await User.find({ tenantId: new mongoose.Types.ObjectId(tenantId), role: "clinic_owner" }).lean();
        const doctorId = doctors.length > 0 ? doctors[0]._id.toString() : "system";

        // Calculate duration and occupiedSlots
        const startParts = startTime.split(":").map(Number);
        const endParts = endTime.split(":").map(Number);
        const startMin = startParts[0] * 60 + startParts[1];
        const endMin = endParts[0] * 60 + endParts[1];
        const durationMin = endMin - startMin;

        const occupiedSlots = [];
        let currentMin = startMin;
        while (currentMin < endMin) {
          const h = Math.floor(currentMin / 60).toString().padStart(2, "0");
          const m = (currentMin % 60).toString().padStart(2, "0");
          occupiedSlots.push(`${h}:${m}`);
          currentMin += 30; // 30 min intervals
        }

        await Appointment.create({
          tenantId: new mongoose.Types.ObjectId(tenantId),
          patientId: blockPatient._id,
          doctorId,
          date: targetDate,
          startTime,
          endTime,
          durationMin,
          occupiedSlots,
          treatment: "Bloqué par le médecin",
          source: "ai",
          status: "scheduled"
        });
        
        finalReply = `Les horaires de ${startTime} à ${endTime} le ${targetDate} ont été bloqués avec succès.`;
      } else {
        finalReply = `Veuillez préciser l'heure de début et l'heure de fin pour bloquer l'agenda.`;
      }
    }

    await this.sendReply(tenantId, conversationId, finalReply, inboundWaId);
  }

  private async sendReply(
    tenantId: string,
    conversationId: string,
    content: string,
    inboundWaId?: string
  ) {
    const tenantDoc = await Tenant.findById(tenantId).lean();
    const waToken = tenantDoc?.settings?.whatsappConfig?.accessToken || process.env.META_ACCESS_TOKEN?.trim();
    const waPhoneId = tenantDoc?.settings?.whatsappConfig?.phoneNumberId || process.env.META_PHONE_NUMBER_ID?.trim();

    if (!waToken || !waPhoneId) {
      console.error("[AI Doctor] WhatsApp not configured for this tenant");
      return;
    }

    const conversation = await Conversation.findById(conversationId).lean();
    if (!conversation) return;

    const deterministicId = inboundWaId ? `ai-doc-${inboundWaId}` : `ai-doc-push-${Date.now()}`;

    try {
      await Message.create({
        tenantId,
        conversationId,
        direction: "outbound",
        status: "sent",
        content,
        providerMessageId: `temp-doc-reply-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        idempotencyKey: deterministicId,
      });
    } catch (err: any) {
      if (err.code === 11000) {
        console.log(`[AI Doctor] Message already sent for ${inboundWaId}`);
        return;
      }
      throw err;
    }

    // Call WhatsApp API (TODO: Use communication service for outbound messages)
    try {
      const response = await fetch(`https://graph.facebook.com/v21.0/${waPhoneId}/messages`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${waToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: conversation.contactWaId,
          type: "text",
          text: { preview_url: false, body: content },
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message || "Unknown Meta error");
      }

      await Message.updateOne(
        { idempotencyKey: deterministicId },
        { $set: { providerMessageId: data.messages[0].id } }
      );
    } catch (apiErr: any) {
      console.error("[AI Doctor] Failed to send WhatsApp message:", apiErr.message);
      await Message.updateOne(
        { idempotencyKey: deterministicId },
        { $set: { status: "failed", error: apiErr.message } }
      );
    }
  }
}

export const aiDoctorService = new AIDoctorService();
