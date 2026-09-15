import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/medical-ai-test';
import { Message } from '../modules/communications/communication.model';

async function cleanup() {
  await mongoose.connect(MONGO_URI);
  const testWamids = ["wamid.inbound.1", "wamid.outbound.1", "wamid.concurrent.1", "wamid.unknown.1"];
  const result = await Message.deleteMany({ providerMessageId: { $in: testWamids } });
  console.log('Deleted:', result.deletedCount);
  const remaining = await Message.find({ providerMessageId: { $in: testWamids } });
  console.log('Remaining:', remaining.length);
  await mongoose.disconnect();
}
cleanup().catch(console.error);
