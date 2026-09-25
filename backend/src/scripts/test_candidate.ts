import mongoose from 'mongoose';
import { Tenant } from '../modules/tenants/tenant.model';
import { availabilityService } from '../modules/appointments/availability.service';

mongoose.connect('mongodb://localhost:27017/medical-ai').then(async () => {
  const tenantId = '6ab52f2b096ea69946369d16';
  const tenant = await Tenant.findById(tenantId).lean();
  
  const rawBusinessHours = tenant!.settings!.businessHours;
  const dayEn = 'monday';
  const dayBH = rawBusinessHours[dayEn];
  console.log('dayBH blocks:', dayBH);
  
  const durationMin = 30;
  const candidateSlots = [];
  function parseTime(timeStr: string): number {
    const [h, m] = timeStr.split(":").map(Number);
    return h * 60 + m;
  }
  function formatTime(mins: number): string {
    const h = Math.floor(mins / 60).toString().padStart(2, "0");
    const m = (mins % 60).toString().padStart(2, "0");
    return `${h}:${m}`;
  }

  for (const block of dayBH) {
    if (!block.start || !block.end) continue;
    
    let currentMin = parseTime(block.start);
    const endMin = parseTime(block.end);

    while (currentMin + durationMin <= endMin) {
      candidateSlots.push({
        startTime: formatTime(currentMin),
        endTime: formatTime(currentMin + durationMin),
      });
      const step = durationMin <= 20 ? 15 : 30;
      currentMin += step;
    }
  }
  console.log('candidates:', candidateSlots.map(s => s.startTime).join(', '));
  
  process.exit(0);
}).catch(console.error);
