"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const tenant_model_1 = require("../modules/tenants/tenant.model");
async function testResolution() {
    await mongoose_1.default.connect('mongodb://localhost:27017/medical-ai');
    const tenants = await tenant_model_1.Tenant.find();
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
    const allTenants = await tenant_model_1.Tenant.find({ status: { $in: ['active', 'trial'] } });
    let matchedTenant = null;
    for (const t of allTenants) {
        const rawWaPhone = t.settings?.whatsappConfig?.phoneNumber || '';
        const rawClinicPhone = t.phone || '';
        const cleanWaPhone = rawWaPhone.replace(/\D/g, '');
        const cleanClinicPhone = rawClinicPhone.replace(/\D/g, '');
        if ((cleanWaPhone && (cleanWaPhone === cleanDisplay || cleanDisplay.endsWith(cleanWaPhone) || cleanWaPhone.endsWith(cleanDisplay))) ||
            (cleanClinicPhone && (cleanClinicPhone === cleanDisplay || cleanDisplay.endsWith(cleanClinicPhone) || cleanClinicPhone.endsWith(cleanDisplay)))) {
            matchedTenant = t;
            break;
        }
    }
    console.log('--> Match result for', displayPhoneNumber, ':', matchedTenant?.name);
    await mongoose_1.default.disconnect();
}
testResolution();
//# sourceMappingURL=test-tenant-resolution.js.map