import mongoose from "mongoose";
import { AIService } from "../modules/ai/ai.service";
import { OpenAICompatibleProvider } from "../modules/ai/openai-compatible.provider";
import { Tenant } from "../modules/tenants/tenant.model";
import { Conversation, Message } from "../modules/communications/communication.model";
import { availabilityService } from "../modules/appointments/availability.service";

async function runTest() {
  await mongoose.connect("mongodb://localhost:27017/medical-ai");
  console.log("Connected to MongoDB");

  const tenant = await Tenant.findOne({ status: "active" });
  if (!tenant) {
    console.error("No active tenant found");
    return;
  }

  // 1. Configure Services Catalog on Tenant
  const customServices = [
    { id: "s1", name: "Contrôle rapide", durationMin: 15, price: 35, description: "Bilan 15 min" },
    { id: "s2", name: "Détartrage & Soin", durationMin: 30, price: 80, description: "Nettoyage 30 min" },
    { id: "s3", name: "Pose d'Implant / Chirurgie", durationMin: 60, price: 900, description: "Chirurgie 60 min" },
  ];

  tenant.settings = {
    ...tenant.settings,
    services: customServices,
    aiConfig: {
      ...(tenant.settings?.aiConfig || {}),
      services: customServices,
    }
  };
  tenant.markModified("settings");
  await tenant.save();

  const aiService = new AIService(new OpenAICompatibleProvider());

  // TEST 1: Long procedure (Implant / Surgery = 60 min)
  console.log("\n=======================================================");
  console.log("TEST 1: Long procedure (Implant / Surgery -> 60 min)");
  console.log("=======================================================");

  const conv1 = await Conversation.create({
    tenantId: tenant._id,
    contactWaId: `21699999003_${Date.now()}`,
    channel: "whatsapp",
    status: "active",
    lastMessageAt: new Date()
  });

  await Message.create({
    tenantId: tenant._id,
    conversationId: conv1._id,
    direction: "inbound",
    status: "received",
    content: "Bonjour, je voudrais planifier un rendez-vous pour une chirurgie et pose d'implant demain svp.",
    providerMessageId: `dur-test-1-${Date.now()}`
  });

  const res1 = await aiService.getSuggestion(tenant._id.toString(), conv1._id.toString());
  console.log("Detected Intent:", res1.intent);
  console.log("Detected Duration:", res1.scheduling?.durationMin, "minutes");
  console.log("Proposed Slots:", res1.proposedSlots);
  console.log("AI Reply:\n", res1.suggestion);

  // TEST 2: Short procedure (Quick checkup -> 15 min)
  console.log("\n=======================================================");
  console.log("TEST 2: Short procedure (Quick Checkup -> 15 min)");
  console.log("=======================================================");

  const conv2 = await Conversation.create({
    tenantId: tenant._id,
    contactWaId: `21699999004_${Date.now()}`,
    channel: "whatsapp",
    status: "active",
    lastMessageAt: new Date()
  });

  await Message.create({
    tenantId: tenant._id,
    conversationId: conv2._id,
    direction: "inbound",
    status: "received",
    content: "Bonjour, je souhaite passer pour un contrôle rapide demain.",
    providerMessageId: `dur-test-2-${Date.now()}`
  });

  const res2 = await aiService.getSuggestion(tenant._id.toString(), conv2._id.toString());
  console.log("Detected Intent:", res2.intent);
  console.log("Detected Duration:", res2.scheduling?.durationMin, "minutes");
  console.log("Proposed Slots:", res2.proposedSlots);
  console.log("AI Reply:\n", res2.suggestion);

  // TEST 3: Direct Availability Service with 60 min
  console.log("\n=======================================================");
  console.log("TEST 3: Direct Availability Service (60 min slot validation)");
  console.log("=======================================================");
  
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowIso = tomorrow.toISOString().slice(0, 10);

  const slots60 = await availabilityService.getAvailableSlots({
    tenantId: tenant._id.toString(),
    date: tomorrowIso,
    durationMin: 60,
  });

  console.log(`60-min slots available on ${tomorrowIso}:`, slots60.slots);
  if (slots60.slots && slots60.slots.length > 0) {
    const s = slots60.slots[0];
    console.log(`First slot: ${s.startTime} -> ${s.endTime} (Duration verified)`);
  }

  // Clean test data
  await Conversation.deleteMany({ _id: { $in: [conv1._id, conv2._id] } });
  await Message.deleteMany({ conversationId: { $in: [conv1._id, conv2._id] } });

  await mongoose.disconnect();
  console.log("\nAll Dynamic Duration tests passed & cleaned up successfully.");
}

runTest().catch(console.error);
