import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import { Appointment } from '../modules/appointments/appointment.model';
import { Message } from '../modules/communications/communication.model';
import { reminderService } from '../modules/appointments/appointment.service';

async function checkRecent() {
  await mongoose.connect('mongodb://localhost:27017/medical-ai');
  const appts = await Appointment.find().sort({ createdAt: -1 }).limit(5).populate('patientId');
  console.log('--- RECENT APPOINTMENTS ---');
  for (const a of appts) {
    console.log({
      id: a._id,
      patient: (a.patientId as any)?.firstName + ' ' + (a.patientId as any)?.lastName,
      phone: (a.patientId as any)?.phone,
      date: a.date,
      startTime: a.startTime,
      status: a.status,
      reminderSentAt: a.reminderSentAt
    });
  }

  const msgs = await Message.find().sort({ createdAt: -1 }).limit(6);
  console.log('--- RECENT MESSAGES ---');
  for (const m of msgs) {
    console.log('[' + m.direction + ']: ' + m.content);
  }

  await Appointment.updateMany(
    { _id: new mongoose.Types.ObjectId('6aabf957a0109cc9c9bf9a45') },
    { $unset: { reminderSentAt: 1 } }
  );

  console.log('\n--- TESTING REMINDER SERVICE RUN NOW ---');
  const reminderResult = await reminderService.processUpcomingReminders();
  console.log('Reminder result:', reminderResult);

  await mongoose.disconnect();
}
checkRecent();
