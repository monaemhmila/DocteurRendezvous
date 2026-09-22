import mongoose from 'mongoose';
import { User } from '../modules/users/user.model';
import { Tenant } from '../modules/tenants/tenant.model';

async function testTeam() {
  await mongoose.connect('mongodb://localhost:27017/medical-ai');
  const tenant = await Tenant.findOne({ status: 'active' });
  console.log('Active Tenant:', tenant?.name, tenant?._id);

  const users = await User.find({ tenantId: tenant?._id });
  console.log('Team members in DB:', users.map(u => ({
    name: `${u.firstName} ${u.lastName}`,
    email: u.email,
    role: u.role,
    specialty: u.specialty,
    permissions: u.permissions
  })));

  await mongoose.disconnect();
}
testTeam();
