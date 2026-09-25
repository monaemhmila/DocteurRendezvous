import mongoose from 'mongoose';
import { availabilityService } from '../modules/appointments/availability.service';
import dotenv from 'dotenv';
dotenv.config({path: '../../.env'});

mongoose.connect('mongodb://localhost:27017/medical-ai').then(async () => {
  const db = mongoose.connection.db!;
  const tenant = await db.collection('tenants').findOne();
  if (!tenant) { console.log('No tenant found'); process.exit(1); }
  const slots = await availabilityService.getAvailableSlots({ tenantId: tenant._id.toString(), date: '2026-09-28', durationMin: 30 });
  console.log('Result:', JSON.stringify(slots, null, 2));
  process.exit(0);
}).catch(console.error);
