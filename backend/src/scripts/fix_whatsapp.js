const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/medical-ai').then(async () => {
  const db = mongoose.connection.db;
  const res = await db.collection('tenants').updateOne(
    { name: 'Cabinet Cardiologie' },
    { $set: { 
        'settings.whatsappConfig.phoneNumberId': '1340956625763958',
        'settings.whatsappConfig.phoneNumber': '+216 92 751 296',
        'settings.whatsappConfig.verifyToken': 'medical_ai_secret_token_2026'
      } 
    }
  );
  console.log('Updated tenant:', res.modifiedCount);
  process.exit(0);
}).catch(console.error);
