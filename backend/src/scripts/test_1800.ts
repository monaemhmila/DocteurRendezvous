import mongoose from 'mongoose';
import { Tenant } from '../modules/tenants/tenant.model';
import { User } from '../modules/users/user.model';
import { availabilityService } from '../modules/appointments/availability.service';

mongoose.connect('mongodb://localhost:27017/medical-ai').then(async () => {
  const tenantId = '6ab52f2b096ea69946369d16';
  
  const allSlots = await availabilityService.getAvailableSlots({ tenantId, date: '2026-09-28', durationMin: 30 });
  console.log('All slots for 28th:', allSlots.slots?.map(s => s.startTime).join(', '));
  console.log('Slot 18:00 present?', allSlots.slots?.some(s => s.startTime === '18:00'));
  
  process.exit(0);
}).catch(console.error);
