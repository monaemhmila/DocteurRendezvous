"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const mongoose_1 = __importDefault(require("mongoose"));
const appointment_model_1 = require("../modules/appointments/appointment.model");
const communication_model_1 = require("../modules/communications/communication.model");
const appointment_service_1 = require("../modules/appointments/appointment.service");
async function checkRecent() {
    await mongoose_1.default.connect('mongodb://localhost:27017/medical-ai');
    const appts = await appointment_model_1.Appointment.find().sort({ createdAt: -1 }).limit(5).populate('patientId');
    console.log('--- RECENT APPOINTMENTS ---');
    for (const a of appts) {
        console.log({
            id: a._id,
            patient: a.patientId?.firstName + ' ' + a.patientId?.lastName,
            phone: a.patientId?.phone,
            date: a.date,
            startTime: a.startTime,
            status: a.status,
            reminderSentAt: a.reminderSentAt
        });
    }
    const msgs = await communication_model_1.Message.find().sort({ createdAt: -1 }).limit(6);
    console.log('--- RECENT MESSAGES ---');
    for (const m of msgs) {
        console.log('[' + m.direction + ']: ' + m.content);
    }
    await appointment_model_1.Appointment.updateMany({ _id: new mongoose_1.default.Types.ObjectId('6aabf957a0109cc9c9bf9a45') }, { $unset: { reminderSentAt: 1 } });
    console.log('\n--- TESTING REMINDER SERVICE RUN NOW ---');
    const reminderResult = await appointment_service_1.reminderService.processUpcomingReminders();
    console.log('Reminder result:', reminderResult);
    await mongoose_1.default.disconnect();
}
checkRecent();
//# sourceMappingURL=check-reminders.js.map