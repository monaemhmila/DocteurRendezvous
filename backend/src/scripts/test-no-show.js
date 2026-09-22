"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const tenant_model_1 = require("../modules/tenants/tenant.model");
const patient_model_1 = require("../modules/patients/patient.model");
const communication_model_1 = require("../modules/communications/communication.model");
const ai_service_1 = require("../modules/ai/ai.service");
const openai_compatible_provider_1 = require("../modules/ai/openai-compatible.provider");
async function test() {
    console.log("Connecting to MongoDB...");
    await mongoose_1.default.connect("mongodb://localhost:27017/medical-ai");
    const tenant = await tenant_model_1.Tenant.findOne({ status: "active" });
    if (!tenant)
        throw new Error("No active tenant found");
    // Setup Patient with 3 No-Shows (limit is 2)
    await patient_model_1.Patient.deleteMany({ phone: "+21699999999" });
    const patient = await patient_model_1.Patient.create({
        tenantId: tenant._id,
        firstName: "Test",
        lastName: "NoShow",
        phone: "+21699999999",
        status: "active",
        metrics: {
            noShowCount: 3
        }
    });
    // Ensure policy is enabled
    tenant.settings = {
        ...tenant.settings,
        noShowPolicy: {
            enabled: true,
            maxAllowed: 2,
            rejectionMessage: "TEST REJECTION MESSAGE: Suite à plusieurs rendez-vous non honorés..."
        }
    };
    await tenant.save();
    await communication_model_1.Conversation.deleteMany({ patientId: patient._id });
    await communication_model_1.Conversation.deleteMany({ contactWaId: "test-no-show-" + patient._id });
    const conv = await communication_model_1.Conversation.create({
        tenantId: tenant._id,
        patientId: patient._id,
        contactWaId: "test-no-show-" + patient._id,
        channel: "whatsapp",
        status: "active",
        lastMessageAt: new Date(),
    });
    await communication_model_1.Message.deleteMany({ providerMessageId: "msg-test-noshow-" + patient._id });
    await communication_model_1.Message.create({
        tenantId: tenant._id,
        conversationId: conv._id,
        direction: "inbound",
        status: "received",
        content: "Bonjour, je voudrais prendre un rendez-vous pour demain.",
        providerMessageId: "msg-test-noshow-" + patient._id
    });
    console.log("Running AI Service...");
    const aiService = new ai_service_1.AIService(new openai_compatible_provider_1.OpenAICompatibleProvider());
    const res = await aiService.getSuggestion(tenant._id.toString(), conv._id.toString());
    console.log("=== AI RESPONSE WITH NO-SHOW POLICY ===");
    console.log("Reply:", res.suggestion);
    console.log("Intent:", res.intent);
    console.log("Needs Escalation:", res.needsHumanEscalation);
    console.log("Action:", res.action);
    console.log("\n=== NOW DISABLING POLICY ===");
    tenant.settings.noShowPolicy.enabled = false;
    await tenant.save();
    const res2 = await aiService.getSuggestion(tenant._id.toString(), conv._id.toString());
    console.log("Reply:", res2.suggestion);
    console.log("Intent:", res2.intent);
    await mongoose_1.default.disconnect();
}
test().catch(console.error);
//# sourceMappingURL=test-no-show.js.map