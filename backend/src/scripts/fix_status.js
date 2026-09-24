const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/medical-ai').then(async () => {
  const db = mongoose.connection.db;
  const res = await db.collection('users').updateMany({}, { $set: { status: 'active' } });
  console.log('Updated users:', res.modifiedCount);
  process.exit(0);
}).catch(console.error);
