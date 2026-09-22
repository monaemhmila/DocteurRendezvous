"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const mongoose_1 = __importDefault(require("mongoose"));
const availability_service_1 = require("../modules/appointments/availability.service");
const tenant_model_1 = require("../modules/tenants/tenant.model");
const ai_service_1 = require("../modules/ai/ai.service");
const openai_compatible_provider_1 = require("../modules/ai/openai-compatible.provider");
async function testTemporalIntegrity() {
    await mongoose_1.default.connect('mongodb://localhost:27017/medical-ai');
    const tenant = await tenant_model_1.Tenant.findOne({ status: 'active' });
    if (!tenant)
        return;
    const now = new Date();
    const todayIso = now.toISOString().slice(0, 10);
    const currentHours = now.getHours().toString().padStart(2, "0");
    const currentMins = now.getMinutes().toString().padStart(2, "0");
    console.log(`Current Date: ${todayIso}, Current Time: ${currentHours}:${currentMins}`);
    // Test 1: getAvailableSlots for TODAY
    const todaySlots = await availability_service_1.availabilityService.getAvailableSlots({
        tenantId: tenant._id.toString(),
        date: todayIso,
        durationMin: 30,
    });
    console.log('\n--- Slots returned for TODAY ---');
    console.log('Slots:', todaySlots.slots);
    // Verify none of the slots is <= current time
    const currentTotalMins = now.getHours() * 60 + now.getMinutes();
    const anyPast = todaySlots.slots?.some((s) => {
        const [h, m] = s.startTime.split(':').map(Number);
        return h * 60 + m <= currentTotalMins;
    });
    console.log('Are there any past slots in today\'s results?', anyPast ? '❌ YES (BUG)' : '✅ NO (All slots are in the future!)');
    // Test 2: AI direct prompt testing
    const aiService = new ai_service_1.AIService(new openai_compatible_provider_1.OpenAICompatibleProvider());
    console.log('\n--- Testing AI response for a patient asking: "Bonjour je veux un rdv aujourd\'hui à 10h" ---');
    const result = await aiService.provider.generateCompletion([
        {
            role: 'system',
            content: `You are the medical front desk assistant. Respond in JSON format: {"reply": "..."}.
CURRENT DATE: ${todayIso}
CURRENT TIME: ${currentHours}:${currentMins}
TEMPORAL INTEGRITY RULE: Never offer or accept slots in the past. At ${currentHours}:${currentMins}, 10:00 is ALREADY PASSED today.`
        },
        {
            role: 'user',
            content: "Bonjour je voudrais un rendez-vous aujourd'hui à 10h svp"
        }
    ]);
    console.log('AI Response:', result);
    await mongoose_1.default.disconnect();
}
testTemporalIntegrity();
//# sourceMappingURL=test-anti-anachronism.js.map