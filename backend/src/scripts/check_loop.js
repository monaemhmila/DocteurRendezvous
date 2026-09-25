const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/medical-ai').then(async () => {
  const db = mongoose.connection.db;
  const msgs = await db.collection('messages').find({}).sort({createdAt: -1}).limit(20).toArray();
  console.log(JSON.stringify(msgs.reverse().map(m => ({ dir: m.direction, content: m.content })), null, 2));
  process.exit(0);
}).catch(console.error);
