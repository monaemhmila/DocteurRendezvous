const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/medical-ai').then(async () => {
  const db = mongoose.connection.db;
  const tenant = await db.collection('tenants').findOne({ name: 'Cabinet Cardiologie' });
  const parent = await db.collection('patients').findOne({ firstName: 'Mohamedjasser' });
  const yahya = await db.collection('patients').findOne({ firstName: 'Yahya', lastName: 'Bensmida' });

  // Move Mohamedjasser to 09:00
  await db.collection('appointments').updateOne(
    { patientId: parent._id, date: '2026-09-25' },
    { $set: { startTime: '09:00', endTime: '09:30' } }
  );

  // Move Yahya to 09:30
  await db.collection('appointments').updateOne(
    { patientId: yahya._id, date: '2026-09-25' },
    { $set: { startTime: '09:30', endTime: '10:00' } }
  );

  console.log('Appointments fixed!');
  process.exit(0);
}).catch(console.error);
