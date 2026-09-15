"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/medical-ai-test';
const communication_model_1 = require("../modules/communications/communication.model");
async function cleanup() {
    await mongoose_1.default.connect(MONGO_URI);
    const testWamids = ["wamid.inbound.1", "wamid.outbound.1", "wamid.concurrent.1", "wamid.unknown.1"];
    const result = await communication_model_1.Message.deleteMany({ providerMessageId: { $in: testWamids } });
    console.log('Deleted:', result.deletedCount);
    const remaining = await communication_model_1.Message.find({ providerMessageId: { $in: testWamids } });
    console.log('Remaining:', remaining.length);
    await mongoose_1.default.disconnect();
}
cleanup().catch(console.error);
//# sourceMappingURL=check_orphaned.js.map