const admin = require('./adminInit');
const db = admin.firestore();

async function main() {
  try {
    // Pending fuel orders
    const fuelSnap = await db.collection('fuelOrders')
      .where('status', '==', 'pending')
      .limit(10)
      .get();
    console.log(`Pending fuel orders: ${fuelSnap.size}`);
    fuelSnap.forEach(d => {
      const data = d.data();
      console.log(`  - ${d.id}: fuel=${data.fuelType}, amount=${data.amount}, riderId=${data.riderId || 'none'}, customer=${data.customerPhone || data.customerId || 'unknown'}`);
    });

    // Available riders
    const riderSnap = await db.collection('riders')
      .where('status', '==', 'available')
      .limit(10)
      .get();
    console.log(`Available riders: ${riderSnap.size}`);
    riderSnap.forEach(d => {
      const data = d.data();
      console.log(`  - ${d.id}: name=${data.name || 'unknown'}, fcmToken=${data.fcmToken ? 'set' : 'missing'}`);
    });
  } catch (error) {
    console.error('Error:', error.message);
  }
  process.exit(0);
}

main();
