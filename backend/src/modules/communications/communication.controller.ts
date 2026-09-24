import { Response } from "express";
import { AuthRequest } from "../../shared/middleware/requireAuth";
import { Conversation, Message } from "./communication.model";
import { Patient } from "../patients/patient.model";
import { Tenant } from "../tenants/tenant.model";
import { MetaWhatsAppProvider } from "./providers/messaging.provider";
import { parsePagination, buildPaginationMeta } from "../../shared/utils/pagination";

const whatsappProvider = new MetaWhatsAppProvider();

const resolveTenantId = async (req: AuthRequest): Promise<string | null> => {
  return req.user?.tenantId || null;
};

export const getConversations = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) {
      return res.status(403).json({ error: "No tenant context" });
    }

    const { page, limit } = req.query;
    const pagination = parsePagination(page, limit);

    // Stable sort: lastMessageAt DESC (most recent first), _id DESC (tiebreak)
    // Uses a single aggregation to avoid N+1 queries.
    // We do NOT load message history here — only the last message summary.
    const tenantObjectId = new (require("mongoose").Types.ObjectId)(tenantId);

    const [data, total] = await Promise.all([
      Conversation.aggregate([
        { $match: { tenantId: tenantObjectId } },
        { $sort: { lastMessageAt: -1, _id: -1 } },
        { $skip: pagination.skip },
        { $limit: pagination.limit },
        // Join patient info (only needed fields)
        {
          $lookup: {
            from: "patients",
            localField: "patientId",
            foreignField: "_id",
            as: "_patient",
            pipeline: [{ $project: { firstName: 1, lastName: 1, phone: 1 } }]
          }
        },
        { $addFields: { patientId: { $arrayElemAt: ["$_patient", 0] } } },
        // Join last message only (no full history loaded)
        {
          $lookup: {
            from: "messages",
            let: { convId: "$_id", tid: "$tenantId" },
            pipeline: [
              { $match: { $expr: { $and: [{ $eq: ["$conversationId", "$$convId"] }, { $eq: ["$tenantId", "$$tid"] }] } } },
              { $sort: { createdAt: -1 } },
              { $limit: 1 },
              { $project: { content: 1, direction: 1, createdAt: 1, status: 1 } }
            ],
            as: "_lastMessage"
          }
        },
        { $addFields: { lastMessage: { $arrayElemAt: ["$_lastMessage", 0] } } },
        // Strip internal fields; keep only what the frontend needs
        {
          $project: {
            _patient: 0,
            _lastMessage: 0,
            pendingBookingContext: 0,
            pendingBookingIntent: 0
          }
        }
      ]),
      Conversation.countDocuments({ tenantId: tenantObjectId })
    ]);

    const meta = buildPaginationMeta(total, pagination.page, pagination.limit);
    return res.json({ data, meta });
  } catch (error) {
    console.error("[getConversations] Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const getConversationMessages = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) {
      return res.status(403).json({ error: "No tenant context" });
    }

    const { id } = req.params;

    // Verify conversation belongs to tenant
    const conversation = await Conversation.findOne({ _id: id, tenantId });
    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    const { page, limit } = req.query;
    const pagination = parsePagination(page, limit);

    const [data, total] = await Promise.all([
      Message.find({ tenantId, conversationId: id })
        .sort({ createdAt: -1, _id: -1 }) // Stable sort for pagination
        .skip(pagination.skip)
        .limit(pagination.limit)
        .lean(),
      Message.countDocuments({ tenantId, conversationId: id })
    ]);

    const meta = buildPaginationMeta(total, pagination.page, pagination.limit);
    return res.json({ data, meta });
  } catch (error) {
    console.error("[getConversationMessages] Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const sendMessage = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) {
      return res.status(403).json({ error: "No tenant context" });
    }

    const id = req.params["id"];
    const content = req.body["content"];

    if (!id) {
      return res.status(404).json({ error: "Conversation not found" });
    }
    
    if (!content || typeof content !== "string" || !content.trim()) {
      return res.status(400).json({ error: "Message content is required" });
    }

    // Verify conversation belongs to tenant
    const conversation = await Conversation.findOne({ _id: id, tenantId });
    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    // Load Tenant to get WhatsApp configuration
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      return res.status(404).json({ error: "Tenant not found" });
    }

    // Attempt to send the message using the Meta provider
    let providerResponse;
    try {
      providerResponse = await whatsappProvider.sendMessage(
        {
          to: conversation.contactWaId,
          type: "text",
          content: content.trim(),
        },
        tenant
      );
    } catch (providerError: any) {
      console.error("[sendMessage] Provider error:", providerError);
      return res.status(502).json({ error: providerError.message || "Failed to send message via provider" });
    }

    // ONLY IF successful, we persist the message
    const newMessage = await Message.create({
      tenantId,
      conversationId: conversation._id,
      patientId: conversation.patientId,
      direction: "outbound",
      status: "sent",
      content: content.trim(),
      providerMessageId: providerResponse.providerMessageId,
    });

    // Update conversation lastMessageAt
    conversation.lastMessageAt = new Date();
    await conversation.save();

    return res.json(newMessage);
  } catch (error) {
    console.error("[sendMessage] Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const simulateInboundMessage = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) {
      return res.status(403).json({ error: "No tenant context" });
    }

    const { conversationId, patientId, phone, content } = req.body;

    if (!content || typeof content !== "string" || !content.trim()) {
      return res.status(400).json({ error: "Message content is required" });
    }

    let conversation: any = null;

    if (conversationId) {
      conversation = await Conversation.findOne({ _id: conversationId, tenantId });
    }

    if (!conversation && patientId) {
      const patient = await Patient.findOne({ _id: patientId, tenantId });
      if (patient) {
        conversation = await Conversation.findOne({ tenantId, patientId: patient._id });
        if (!conversation) {
          conversation = await Conversation.create({
            tenantId,
            patientId: patient._id,
            contactWaId: patient.phone || `+216${Math.floor(10000000 + Math.random() * 90000000)}`,
            channel: "whatsapp",
            status: "active",
            lastMessageAt: new Date(),
          });
        }
      }
    }

    if (!conversation && phone) {
      conversation = await Conversation.findOne({ tenantId, contactWaId: phone });
      if (!conversation) {
        const patient = await Patient.findOne({ tenantId, phone });
        conversation = await Conversation.create({
          tenantId,
          ...(patient ? { patientId: patient._id } : {}),
          contactWaId: phone,
          channel: "whatsapp",
          status: "active",
          lastMessageAt: new Date(),
        });
      }
    }

    if (!conversation) {
      // Fallback to first available patient for this tenant
      const fallbackPatient = await Patient.findOne({ tenantId });
      if (fallbackPatient) {
        conversation = await Conversation.create({
          tenantId,
          patientId: fallbackPatient._id,
          contactWaId: fallbackPatient.phone,
          channel: "whatsapp",
          status: "active",
          lastMessageAt: new Date(),
        });
      } else {
        return res.status(400).json({ error: "No patient or conversation found to simulate message." });
      }
    }

    const wamid = `sim-in-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    // 1. Persist inbound message from patient
    const inboundMessage = await Message.create({
      tenantId,
      conversationId: conversation._id,
      patientId: conversation.patientId,
      direction: "inbound",
      status: "received",
      content: content.trim(),
      providerMessageId: wamid,
    });

    conversation.lastMessageAt = new Date();
    await conversation.save();

    // 2. Trigger AI Auto-Booking Flow
    const { aiAutoBookingService } = await import("../ai/ai.auto-booking.service");
    try {
      await aiAutoBookingService.processInboundMessage(
        tenantId.toString(),
        conversation._id.toString(),
        wamid
      );
    } catch (aiErr: any) {
      console.error("[simulateInboundMessage] AI processing error:", aiErr.message);
    }

    // 3. Return updated conversation messages
    const updatedMessages = await Message.find({
      tenantId,
      conversationId: conversation._id,
    }).sort({ createdAt: 1 }).lean();

    return res.json({
      success: true,
      conversationId: conversation._id,
      inboundMessage,
      messages: updatedMessages,
    });
  } catch (error: any) {
    console.error("[simulateInboundMessage] Error:", error);
    return res.status(500).json({ error: error.message || "Failed to simulate message" });
  }
};

