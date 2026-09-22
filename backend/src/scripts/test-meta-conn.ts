import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import { Tenant } from '../modules/tenants/tenant.model';
import { Appointment } from '../modules/appointments/appointment.model';
import { Patient } from '../modules/patients/patient.model';
import { Conversation, Message } from '../modules/communications/communication.model';
import { AIService } from '../modules/ai/ai.service';
import { OpenAICompatibleProvider } from '../modules/ai/openai-compatible.provider';

async function testCustomDoctorInstructions() {
  await mongoose.connect('mongodb://localhost:27017/medical-ai');
  const tenant = await Tenant.findOne({ status: 'active' });
  if (!tenant) {
    console.log('No active tenant found');
    await mongoose.disconnect();
    return;
  }

  // Set custom doctor description and settings
  tenant.name = 'Cabinet Dentaire Dr. Sami Ben Amor';
  tenant.address = 'Les Berges du Lac 2, Tunis (Immeuble Coral, 2ème étage avec ascenseur et parking gratuit)';
  tenant.specialty = 'Chirurgie Dentaire & Esthétique';
  tenant.settings = tenant.settings || {};
  tenant.settings.aiConfig = {
    customInstructions: "Vous êtes l'assistant du Dr. Sami Ben Amor (Clinique Dentaire Tunis Lac 2). Soyez toujours chaleureux, clair sur les tarifs (consultation 50 DT, détartrage 80 DT, blanchiment à partir de 350 DT) et précisez que le parking sous-terrain est gratuit pour nos patients.",
    tone: 'empathic',
    mode: 'auto',
    capabilities: {
      autoBooking: true,
      urgencyHandling: true,
      pricingQuotes: true,
      reminders: true,
      doctorEscalation: true,
      multiLanguage: true
    }
  };
  tenant.markModified('settings');
  await tenant.save();

  const updateRes = await Appointment.updateMany(
    { date: '2026-09-18', status: 'scheduled' },
    { $set: { status: 'confirmed' } }
  );
  console.log('Synchronized appointments to CONFIRMED for 2026-09-18:', updateRes.modifiedCount);
  if (!patient) {
    patient = await Patient.create({
      tenantId: tenant._id,
      firstName: 'Mohamed',
      lastName: 'Ben Smida',
      phone: '21658477271',
      status: 'active'
    });
  }

  // Find or create test appointment for tomorrow
  let appt = await Appointment.findOne({ patientId: patient._id, date: tomorrowIso });
  if (!appt) {
    appt = await Appointment.create({
      tenantId: tenant._id,
      patientId: patient._id,
      doctorId: 'test_doc',
      date: tomorrowIso,
      startTime: '10:30',
      endTime: '11:00',
      durationMin: 30,
      treatment: 'Consultation dentaire',
      status: 'scheduled'
    });
  } else {
    appt.status = 'scheduled';
    await appt.save();
  }

  console.log('Initial appointment status before confirmation:', appt.status);

  // Simulate patient replying "Oui confirmer" on WhatsApp
  await Conversation.deleteMany({ contactWaId: '21658477271' });
  const conv = await Conversation.create({
    tenantId: tenant._id,
    patientId: patient._id,
    contactWaId: '21658477271',
    channel: 'whatsapp',
    status: 'active',
    lastMessageAt: new Date()
  });

  await Message.create({
    tenantId: tenant._id,
    conversationId: conv._id,
    patientId: patient._id,
    direction: 'inbound',
    status: 'received',
    content: 'Oui confirmer',
    providerMessageId: 'msg_confirm_test_' + Date.now()
  });

  const { aiAutoBookingService } = await import('../modules/ai/ai.auto-booking.service');
  await aiAutoBookingService.processInboundMessage(tenant._id.toString(), conv._id.toString(), 'msg_confirm_test');

  const updatedAppt = await Appointment.findById(appt._id);
  console.log('Updated appointment status in Agenda after patient reply:', updatedAppt?.status);
  await mongoose.disconnect();
}
testCustomDoctorInstructions().catch(console.error);

