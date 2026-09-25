const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/medical-ai').then(async () => {
  const db = mongoose.connection.db;
  const conv = await db.collection('conversations').find({}).sort({ updatedAt: -1 }).limit(1).toArray();
  if (conv[0]) {
    console.log('Pending intent:', JSON.stringify(conv[0].pendingBookingIntent, null, 2));
    console.log('Pending context:', JSON.stringify(conv[0].pendingBookingContext, null, 2));
  }
  process.exit(0);
}).catch(console.error);
