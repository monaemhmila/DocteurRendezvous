const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;

mongoose.connect('mongodb://localhost:27017/medical-ai').then(async () => {
  const db = mongoose.connection.db;
  const tenant = await db.collection('tenants').findOne({ name: 'Cabinet Cardiologie' });
  const parent = await db.collection('patients').findOne({ firstName: 'Mohamedjasser' });

  let yahya = await db.collection('patients').findOne({ firstName: 'Yahya', lastName: 'Bensmida' });
  if (!yahya) {
    const res = await db.collection('patients').insertOne({
      tenantId: tenant._id,
      firstName: 'Yahya',
      lastName: 'Bensmida',
      phone: parent.phone,
      language: 'fr',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    yahya = { _id: res.insertedId };
  }

  await db.collection('appointments').insertOne({
    tenantId: tenant._id,
    patientId: yahya._id,
    date: '2026-09-25',
    startTime: '10:00',
    endTime: '10:30',
    treatment: 'Consultation générale',
    status: 'scheduled',
    notes: 'Ajouté manuellement suite à une erreur IA de confirmation de cible',
    createdAt: new Date(),
    updatedAt: new Date()
  });

  console.log('Yahya appointment created!');
  process.exit(0);
}).catch(console.error);
