import mongoose from 'mongoose';
import { Tenant } from '../modules/tenants/tenant.model';

async function testResolution() {
  await mongoose.connect('mongodb://localhost:27017/medical-ai');
  const tenants = await Tenant.find();
  console.log('List of tenants in DB:');
  for (const t of tenants) {
    console.log({
      id: t._id,
      name: t.name,
      phone: t.phone,
      whatsappConfig: t.settings?.whatsappConfig
    });
  }

  const displayPhoneNumber = '21692751296';
  const cleanDisplay = displayPhoneNumber.replace(/\D/g, '');
  const allTenants = await Tenant.find({ status: { $in: ['active', 'trial'] } });
  let matchedTenant: any = null;
  for (const t of allTenants) {
    const rawWaPhone = t.settings?.whatsappConfig?.phoneNumber || '';
    const rawClinicPhone = t.phone || '';
    const cleanWaPhone = rawWaPhone.replace(/\D/g, '');
    const cleanClinicPhone = rawClinicPhone.replace(/\D/g, '');

    if (
      (cleanWaPhone && (cleanWaPhone === cleanDisplay || cleanDisplay.endsWith(cleanWaPhone) || cleanWaPhone.endsWith(cleanDisplay))) ||
      (cleanClinicPhone && (cleanClinicPhone === cleanDisplay || cleanDisplay.endsWith(cleanClinicPhone) || cleanClinicPhone.endsWith(cleanDisplay)))
    ) {
      matchedTenant = t;
      break;
    }
  }

  console.log('--> Match result for', displayPhoneNumber, ':', matchedTenant?.name);
  await mongoose.disconnect();
}
testResolution();
