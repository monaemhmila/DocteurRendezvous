import mongoose from "mongoose";
import { Tenant } from "../modules/tenants/tenant.model";
import { Patient } from "../modules/patients/patient.model";
import { Conversation, Message } from "../modules/communications/communication.model";
import { AIService } from "../modules/ai/ai.service";
import { OpenAICompatibleProvider } from "../modules/ai/openai-compatible.provider";

async function test() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect("mongodb://localhost:27017/medical-ai");
  
  const tenant = await Tenant.findOne({ status: "active" });
  if (!tenant) throw new Error("No active tenant found");
  
  // Setup Patient with 3 No-Shows (limit is 2)
  await Patient.deleteMany({ phone: "+21699999999" });
  const patient = await Patient.create({
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

  await Conversation.deleteMany({ patientId: patient._id });
  await Conversation.deleteMany({ contactWaId: "test-no-show-" + patient._id });
  const conv = await Conversation.create({
    tenantId: tenant._id,
    patientId: patient._id,
    contactWaId: "test-no-show-" + patient._id,
    channel: "whatsapp",
    status: "active",
    lastMessageAt: new Date(),
  });

  await Message.deleteMany({ providerMessageId: "msg-test-noshow-" + patient._id });
  await Message.create({
    tenantId: tenant._id,
    conversationId: conv._id,
    direction: "inbound",
    status: "received",
    content: "Bonjour, je voudrais prendre un rendez-vous pour demain.",
    providerMessageId: "msg-test-noshow-" + patient._id
  });

  console.log("Running AI Service...");
  const aiService = new AIService(new OpenAICompatibleProvider());
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

  await mongoose.disconnect();
}
test().catch(console.error);
