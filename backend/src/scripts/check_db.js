const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/medical-ai').then(async () => {
  const db = mongoose.connection.db;
  const appts = await db.collection('appointments').find({
    date: '2026-09-25',
    status: { $nin: ['cancelled', 'no_show'] }
  }).sort({ startTime: 1 }).toArray();

  for (const a of appts) {
    const p = await db.collection('patients').findOne({ _id: a.patientId });
    console.log(a.startTime + '-' + a.endTime, '|', p ? p.firstName + ' ' + p.lastName : 'Unknown', '|', a.status, '| appt_id:', a._id.toString());
  }
  
  console.log('\n--- Total:', appts.length, 'appointments ---');
  process.exit(0);
}).catch(console.error);
