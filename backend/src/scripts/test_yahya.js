const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/medical-ai').then(async () => {
  const db = mongoose.connection.db;
  const msgs = await db.collection('messages').find({ content: { $regex: 'yahya', $options: 'i' } }).toArray();
  console.log('Messages:', JSON.stringify(msgs.map(m => ({ dir: m.direction, content: m.content })), null, 2));
  
  const appts = await db.collection('appointments').find({}).sort({createdAt:-1}).limit(5).toArray();
  console.log('Appts:', appts.map(a => a.date + ' ' + a.startTime));
  
  process.exit(0);
}).catch(console.error);
