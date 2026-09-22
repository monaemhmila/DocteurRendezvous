import mongoose from 'mongoose';
import { User } from '../modules/users/user.model';
import { Tenant } from '../modules/tenants/tenant.model';

async function testFetch() {
  await mongoose.connect('mongodb://localhost:27017/medical-ai');
  const tenant = await Tenant.findOne({ status: 'active' });
  const users = await User.find({ tenantId: tenant?._id }).select('-passwordHash');
  console.log('Successfully retrieved team users for tenant:', tenant?.name);
  console.log('Count:', users.length);
  for (const u of users) {
    console.log(`- [${u.role}] ${u.firstName} ${u.lastName} (${u.email}) - status: ${u.status}`);
  }
  await mongoose.disconnect();
}
testFetch();
