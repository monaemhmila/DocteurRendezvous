"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const user_model_1 = require("../modules/users/user.model");
const tenant_model_1 = require("../modules/tenants/tenant.model");
async function testTeam() {
    await mongoose_1.default.connect('mongodb://localhost:27017/medical-ai');
    const tenant = await tenant_model_1.Tenant.findOne({ status: 'active' });
    console.log('Active Tenant:', tenant?.name, tenant?._id);
    const users = await user_model_1.User.find({ tenantId: tenant?._id });
    console.log('Team members in DB:', users.map(u => ({
        name: `${u.firstName} ${u.lastName}`,
        email: u.email,
        role: u.role,
        specialty: u.specialty,
        permissions: u.permissions
    })));
    await mongoose_1.default.disconnect();
}
testTeam();
//# sourceMappingURL=test-team.js.map