import mongoose from 'mongoose';
import { appointmentService } from '../modules/appointments/appointment.service';

mongoose.connect('mongodb://localhost:27017/medical-ai').then(async () => {
  const tenantId = '6ab52f2b096ea69946369d16';
  const db = mongoose.connection.db!;
  const user = await db.collection('patients').findOne({ firstName: 'Emna', lastName: 'Siala' });
  const appt = await db.collection('appointments').findOne({ tenantId: new mongoose.Types.ObjectId(tenantId), patientId: user!._id });
  console.log('Found appt:', appt);
  
  if (appt) {
    try {
      await appointmentService.updateAppointment(
        appt._id.toString(),
        {
          date: '2026-09-28',
          startTime: '18:00',
          endTime: '18:30',
          durationMin: 30,
          treatment: appt.treatment,
          status: 'scheduled',
          source: 'ai'
        },
        tenantId
      );
      console.log('Update success');
    } catch (e: any) {
      console.log('Update failed:', e.message, e.code);
    }
  }
  process.exit(0);
}).catch(console.error);
