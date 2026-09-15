import { Response } from "express";
import { AuthRequest } from "../../shared/middleware/requireAuth";
import { Conversation, Message } from "./communication.model";

export const getConversations = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(403).json({ error: "No tenant context" });
    }

    const conversations = await Conversation.find({ tenantId })
      .populate("patientId", "firstName lastName phone")
      .sort({ lastMessageAt: -1 })
      .lean();

    return res.json(conversations);
  } catch (error) {
    console.error("[getConversations] Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const getConversationMessages = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(403).json({ error: "No tenant context" });
    }

    const { id } = req.params;

    // Verify conversation belongs to tenant
    const conversation = await Conversation.findOne({ _id: id, tenantId });
    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    const messages = await Message.find({ tenantId, conversationId: id })
      .sort({ createdAt: 1 })
      .lean();

    return res.json(messages);
  } catch (error) {
    console.error("[getConversationMessages] Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

import { Tenant } from "../tenants/tenant.model";
import { MetaWhatsAppProvider } from "./providers/messaging.provider";

const whatsappProvider = new MetaWhatsAppProvider();

export const sendMessage = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
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
