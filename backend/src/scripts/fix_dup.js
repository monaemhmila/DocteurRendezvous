const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/medical-ai').then(async () => {
  const db = mongoose.connection.db;
  
  // Remove duplicate Emna Siala lead patient (keep the active one)
  const result = await db.collection('patients').deleteOne({ 
    firstName: 'Emna', 
    lastName: 'Siala', 
    status: 'lead' 
  });
  console.log('Removed duplicate lead:', result.deletedCount, 'document(s)');
  
  // Verify
  const allPatients = await db.collection('patients').find({ firstName: 'Emna' }).toArray();
  console.log('Remaining Emna records:', allPatients.map(p => `${p.firstName} ${p.lastName} | ${p.status} | ${p.phone}`));
  
  process.exit(0);
}).catch(console.error);
