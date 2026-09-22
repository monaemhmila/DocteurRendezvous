"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const user_model_1 = require("../modules/users/user.model");
const tenant_model_1 = require("../modules/tenants/tenant.model");
async function testFetch() {
    await mongoose_1.default.connect('mongodb://localhost:27017/medical-ai');
    const tenant = await tenant_model_1.Tenant.findOne({ status: 'active' });
    const users = await user_model_1.User.find({ tenantId: tenant?._id }).select('-passwordHash');
    console.log('Successfully retrieved team users for tenant:', tenant?.name);
    console.log('Count:', users.length);
    for (const u of users) {
        console.log(`- [${u.role}] ${u.firstName} ${u.lastName} (${u.email}) - status: ${u.status}`);
    }
    await mongoose_1.default.disconnect();
}
testFetch();
//# sourceMappingURL=test-team-fetch.js.map