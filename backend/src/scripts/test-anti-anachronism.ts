import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import { availabilityService } from '../modules/appointments/availability.service';
import { Tenant } from '../modules/tenants/tenant.model';
import { AIService } from '../modules/ai/ai.service';
import { OpenAICompatibleProvider } from '../modules/ai/openai-compatible.provider';

async function testTemporalIntegrity() {
  await mongoose.connect('mongodb://localhost:27017/medical-ai');
  const tenant = await Tenant.findOne({ status: 'active' });
  if (!tenant) return;

  const now = new Date();
  const todayIso = now.toISOString().slice(0, 10);
  const currentHours = now.getHours().toString().padStart(2, "0");
  const currentMins = now.getMinutes().toString().padStart(2, "0");
  console.log(`Current Date: ${todayIso}, Current Time: ${currentHours}:${currentMins}`);

  // Test 1: getAvailableSlots for TODAY
  const todaySlots = await availabilityService.getAvailableSlots({
    tenantId: tenant._id.toString(),
    date: todayIso,
    durationMin: 30,
  });
  console.log('\n--- Slots returned for TODAY ---');
  console.log('Slots:', todaySlots.slots);

  // Verify none of the slots is <= current time
  const currentTotalMins = now.getHours() * 60 + now.getMinutes();
  const anyPast = todaySlots.slots?.some((s: any) => {
    const [h, m] = s.startTime.split(':').map(Number);
    return h * 60 + m <= currentTotalMins;
  });
  console.log('Are there any past slots in today\'s results?', anyPast ? '❌ YES (BUG)' : '✅ NO (All slots are in the future!)');

  // Test 2: AI direct prompt testing
  const aiService = new AIService(new OpenAICompatibleProvider());
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

  await mongoose.disconnect();
}
testTemporalIntegrity();
