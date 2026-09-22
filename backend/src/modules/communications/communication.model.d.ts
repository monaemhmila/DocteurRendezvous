import mongoose, { Document } from "mongoose";
/**
 * Stores the slots that were actually proposed to the patient in a previous
 * AI response. Used by the auto-booking flow to verify the patient's confirmed
 * slot matches a slot that was genuinely offered — not recalculated on-the-fly.
 */
export interface IPendingBookingContext {
    date: string;
    durationMin: number;
    proposedSlots: Array<{
        startTime: string;
        endTime: string;
    }>;
    proposedAt: Date;
}
export interface IConversation extends Document {
    tenantId: mongoose.Types.ObjectId;
    patientId?: mongoose.Types.ObjectId;
    channel: "whatsapp";
    contactWaId: string;
    status: "active" | "archived";
    lastMessageAt: Date;
    /**
     * Set by aiAutoBookingService when the AI proposes slots to the patient.
     * Cleared after a successful booking or when new slots are proposed.
     * NEVER set by the AI directly — always set by the backend after validating slots.
     */
    pendingBookingContext?: IPendingBookingContext;
    /**
     * Set by the AI conversation service when the AI requests a human takeover
     * (needsHumanEscalation). While true, automatic AI processing is suspended
     * for this conversation — the team handles it from the dashboard.
     * NEVER set by the AI directly — always set by the backend.
     */
    needsHuman?: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Conversation: mongoose.Model<IConversation, {}, {}, {}, Document<unknown, {}, IConversation, {}, mongoose.DefaultSchemaOptions> & IConversation & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IConversation>;
export interface IMessage extends Document {
    tenantId: mongoose.Types.ObjectId;
    conversationId: mongoose.Types.ObjectId;
    patientId?: mongoose.Types.ObjectId;
    direction: "inbound" | "outbound";
    status: "sent" | "delivered" | "read" | "failed" | "received";
    content: string;
    providerMessageId: string;
    error?: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Message: mongoose.Model<IMessage, {}, {}, {}, Document<unknown, {}, IMessage, {}, mongoose.DefaultSchemaOptions> & IMessage & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IMessage>;
//# sourceMappingURL=communication.model.d.ts.map