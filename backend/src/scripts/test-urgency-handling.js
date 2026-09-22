"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const ai_service_1 = require("../modules/ai/ai.service");
const openai_compatible_provider_1 = require("../modules/ai/openai-compatible.provider");
const tenant_model_1 = require("../modules/tenants/tenant.model");
const communication_model_1 = require("../modules/communications/communication.model");
async function runTest() {
    await mongoose_1.default.connect("mongodb://localhost:27017/medical-ai");
    console.log("Connected to MongoDB");
    const tenant = await tenant_model_1.Tenant.findOne({ status: "active" });
    if (!tenant) {
        console.error("No active tenant found");
        return;
    }
    const aiService = new ai_service_1.AIService(new openai_compatible_provider_1.OpenAICompatibleProvider());
    // TEST 1: urgencyHandling = TRUE (ENABLED)
    console.log("\n=======================================================");
    console.log("TEST 1: urgencyHandling = TRUE (Active)");
    console.log("=======================================================");
    tenant.settings = {
        ...tenant.settings,
        aiConfig: {
            ...(tenant.settings?.aiConfig || {}),
            capabilities: {
                ...(tenant.settings?.aiConfig?.capabilities || {}),
                urgencyHandling: true,
            }
        }
    };
    await tenant.save();
    const testWa1 = `21699999001_${Date.now()}`;
    const conv1 = await communication_model_1.Conversation.create({
        tenantId: tenant._id,
        contactWaId: testWa1,
        channel: "whatsapp",
        status: "active",
        lastMessageAt: new Date()
    });
    await communication_model_1.Message.create({
        tenantId: tenant._id,
        conversationId: conv1._id,
        direction: "inbound",
        status: "received",
        content: "Bonjour docteur, j'ai une rage de dent insupportable et la joue gonflée depuis ce matin, avez-vous une place en urgence aujourd'hui svp ?",
        providerMessageId: `urg-test-1-${Date.now()}`
    });
    const res1 = await aiService.getSuggestion(tenant._id.toString(), conv1._id.toString());
    console.log("Intent:", res1.intent);
    console.log("Needs Human Escalation:", res1.needsHumanEscalation);
    console.log("Scheduling Date:", res1.scheduling?.date);
    console.log("AI Reply:\n", res1.suggestion);
    // TEST 2: urgencyHandling = FALSE (DISABLED)
    console.log("\n=======================================================");
    console.log("TEST 2: urgencyHandling = FALSE (Deactivated)");
    console.log("=======================================================");
    tenant.settings.aiConfig.capabilities.urgencyHandling = false;
    tenant.markModified("settings");
    await tenant.save();
    const testWa2 = `21699999002_${Date.now()}`;
    const conv2 = await communication_model_1.Conversation.create({
        tenantId: tenant._id,
        contactWaId: testWa2,
        channel: "whatsapp",
        status: "active",
        lastMessageAt: new Date()
    });
    await communication_model_1.Message.create({
        tenantId: tenant._id,
        conversationId: conv2._id,
        direction: "inbound",
        status: "received",
        content: "Bonjour docteur, j'ai une rage de dent insupportable et la joue gonflée depuis ce matin, avez-vous une place en urgence aujourd'hui svp ?",
        providerMessageId: `urg-test-2-${Date.now()}`
    });
    const res2 = await aiService.getSuggestion(tenant._id.toString(), conv2._id.toString());
    console.log("Intent:", res2.intent);
    console.log("Needs Human Escalation:", res2.needsHumanEscalation);
    console.log("AI Reply:\n", res2.suggestion);
    // Restore urgencyHandling to true
    tenant.settings.aiConfig.capabilities.urgencyHandling = true;
    tenant.markModified("settings");
    await tenant.save();
    // Clean test data
    await communication_model_1.Conversation.deleteMany({ _id: { $in: [conv1._id, conv2._id] } });
    await communication_model_1.Message.deleteMany({ conversationId: { $in: [conv1._id, conv2._id] } });
    await mongoose_1.default.disconnect();
    console.log("\nTest completed & cleaned up successfully.");
}
runTest().catch(console.error);
//# sourceMappingURL=test-urgency-handling.js.map