import mongoose from 'mongoose';
import { availabilityService } from '../modules/appointments/availability.service';

mongoose.connect('mongodb://localhost:27017/medical-ai').then(async () => {
  const tenantId = '6ab52f2b096ea69946369d16';
  const db = mongoose.connection.db!;
  const users = await db.collection('users').find({ tenantId: new mongoose.Types.ObjectId(tenantId) }).toArray();
  const doctorId = users.find(u => u.role === 'clinic_owner' || u.role === 'dentist')?._id.toString() || users[0]._id.toString();
  
  const res = await availabilityService.checkAvailability({ tenantId, doctorId, date: '2026-09-28', startTime: '10:00', endTime: '10:30' });
  console.log('Result for 10:00:', res);
  
  const overlapping = await db.collection('appointments').find({
    tenantId: new mongoose.Types.ObjectId(tenantId),
    doctorId,
    date: '2026-09-28',
    status: { $nin: ['cancelled', 'no_show'] },
    $and: [
      { startTime: { $lt: '10:30' } },
      { endTime: { $gt: '10:00' } }
    ]
  }).toArray();
  console.log('Overlapping in db:', overlapping);
  
  const allSlots = await availabilityService.getAvailableSlots({ tenantId, date: '2026-09-28', durationMin: 30 });
  console.log('All slots for 28th:', allSlots.slots?.map(s => s.startTime).join(', '));
  
  process.exit(0);
}).catch(console.error);
