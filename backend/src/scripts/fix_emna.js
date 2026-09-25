const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/medical-ai').then(async () => {
  const db = mongoose.connection.db;
  
  // 1. Fix Amouna patient: update to Emna Siala (she confirmed it's her real name)
  const amouna = await db.collection('patients').findOne({ firstName: 'Amouna' });
  if (amouna) {
    await db.collection('patients').updateOne(
      { _id: amouna._id },
      { $set: { firstName: 'Emna', lastName: 'Siala', status: 'active' } }
    );
    console.log('Updated Amouna -> Emna Siala');
  }
  
  // 2. Remove the duplicate Emna Siala lead (the one created wrongly as a family member)
  const dupEmna = await db.collection('patients').findOne({ firstName: 'Emna', lastName: 'Siala', status: 'lead' });
  if (dupEmna && dupEmna.phone === '21650048410') {
    // Keep the updated amouna one, remove any lead duplicates
    const allEmna = await db.collection('patients').find({ firstName: 'Emna', lastName: 'Siala' }).toArray();
    console.log('All Emna records:', allEmna.map(e => `${e._id} | status: ${e.status} | phone: ${e.phone}`));
  }
  
  // 3. Clear the stuck pendingBookingIntent for the Amouna conversation
  const amounaCorrectedPatient = await db.collection('patients').findOne({ firstName: 'Emna', lastName: 'Siala' });
  if (amounaCorrectedPatient) {
    const conv = await db.collection('conversations').findOne({ patientId: amounaCorrectedPatient._id });
    if (!conv) {
      // Try to find by phone
      const convByPhone = await db.collection('conversations').findOne({ contactWaId: '21650048410' });
      if (convByPhone) {
        await db.collection('conversations').updateOne(
          { _id: convByPhone._id },
          { $unset: { pendingBookingIntent: 1, pendingBookingContext: 1 } }
        );
        console.log('Cleared pending booking intent for Emna conversation');
      }
    } else {
      await db.collection('conversations').updateOne(
        { _id: conv._id },
        { $unset: { pendingBookingIntent: 1, pendingBookingContext: 1 } }
      );
      console.log('Cleared pending booking intent for Emna conversation');
    }
  }
  
  // 4. Check final state
  console.log('\n=== FINAL STATE ===');
  const allAppts = await db.collection('appointments').find({ date: '2026-09-25' }).sort({ startTime: 1 }).toArray();
  for (const a of allAppts) {
    const p = await db.collection('patients').findOne({ _id: a.patientId });
    console.log(`  ${a.startTime}-${a.endTime} | ${p ? p.firstName + ' ' + p.lastName : 'Unknown'} | ${a.status}`);
  }
  
  process.exit(0);
}).catch(console.error);
