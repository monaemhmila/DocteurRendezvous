const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/medical-ai').then(async () => {
  const db = mongoose.connection.db;
  
  console.log('=== ALL APPOINTMENTS (Sept 25) ===');
  const appts = await db.collection('appointments').find({ date: '2026-09-25' }).sort({ startTime: 1 }).toArray();
  for (const a of appts) {
    const p = await db.collection('patients').findOne({ _id: a.patientId });
    console.log(a.startTime + '-' + a.endTime, '|', p ? p.firstName + ' ' + p.lastName : 'Unknown', '| status:', a.status);
  }
  
  console.log('\n=== ALL PATIENTS ===');
  const patients = await db.collection('patients').find({}).toArray();
  for (const p of patients) {
    console.log(p.firstName, p.lastName, '| phone:', p.phone, '| status:', p.status);
  }
  
  console.log('\n=== CONVERSATIONS (last 3) ===');
  const convs = await db.collection('conversations').find({}).sort({ updatedAt: -1 }).limit(3).toArray();
  for (const c of convs) {
    const p = await db.collection('patients').findOne({ _id: c.patientId });
    console.log('Conv:', c._id, '| patient:', p ? p.firstName + ' ' + p.lastName : 'Unknown', '| waId:', c.contactWaId);
    console.log('  pendingBookingIntent:', JSON.stringify(c.pendingBookingIntent));
    console.log('  pendingBookingContext:', JSON.stringify(c.pendingBookingContext));
  }
  
  process.exit(0);
}).catch(console.error);
