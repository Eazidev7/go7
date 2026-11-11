/**
 * Seed sample fuel stations for testing
 * Run: node seedFuelStations.js
 */

const admin = require('./adminInit');
const db = admin.firestore();

const sampleStations = [
  {
    name: 'Total Energies',
    brand: 'Total',
    location: {
      lat: 7.15,
      lng: 3.35,
      address: 'Itoku, Abeokuta',
      city: 'Abeokuta'
    },
    contact: {
      phone: '08012345678',
      email: 'total.itoku@go7.ng'
    },
    operatingHours: {
      open: '06:00',
      close: '22:00'
    },
    fuelTypes: {
      petrol: { pricePerLitre: 1200, available: true },
      diesel: { pricePerLitre: 1600, available: true },
      cng: { pricePerKg: 1600, available: false }
    },
    rating: 4.5,
    totalOrders: 0,
    isActive: true
  },
  {
    name: 'NNPC Mega Station',
    brand: 'NNPC',
    location: {
      lat: 7.16,
      lng: 3.36,
      address: 'Sabo, Abeokuta',
      city: 'Abeokuta'
    },
    contact: {
      phone: '08023456789',
      email: 'nnpc.sabo@go7.ng'
    },
    operatingHours: {
      open: '06:00',
      close: '22:00'
    },
    fuelTypes: {
      petrol: { pricePerLitre: 1200, available: true },
      diesel: { pricePerLitre: 1600, available: true },
      cng: { pricePerKg: 1600, available: true }
    },
    rating: 4.2,
    totalOrders: 0,
    isActive: true
  },
  {
    name: 'Oando Filling Station',
    brand: 'Oando',
    location: {
      lat: 7.14,
      lng: 3.34,
      address: 'Kemta, Abeokuta',
      city: 'Abeokuta'
    },
    contact: {
      phone: '08034567890',
      email: 'oando.kemta@go7.ng'
    },
    operatingHours: {
      open: '06:00',
      close: '22:00'
    },
    fuelTypes: {
      petrol: { pricePerLitre: 1200, available: true },
      diesel: { pricePerLitre: 1600, available: true },
      cng: { pricePerKg: 1600, available: false }
    },
    rating: 4.0,
    totalOrders: 0,
    isActive: true
  },
  {
    name: 'Mobil Filling Station',
    brand: 'Mobil',
    location: {
      lat: 7.17,
      lng: 3.37,
      address: 'Adatan, Abeokuta',
      city: 'Abeokuta'
    },
    contact: {
      phone: '08045678901',
      email: 'mobil.adatan@go7.ng'
    },
    operatingHours: {
      open: '06:00',
      close: '22:00'
    },
    fuelTypes: {
      petrol: { pricePerLitre: 1200, available: true },
      diesel: { pricePerLitre: 1600, available: true },
      cng: { pricePerKg: 1600, available: true }
    },
    rating: 4.3,
    totalOrders: 0,
    isActive: true
  }
];

async function seedFuelStations() {
  console.log('🚀 Starting fuel station seeding...');
  
  try {
    const batch = db.batch();
    const stationsRef = db.collection('fuelStations');
    
    for (const station of sampleStations) {
      const docRef = stationsRef.doc();
      batch.set(docRef, {
        ...station,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log(`✅ Added station: ${station.name}`);
    }
    
    await batch.commit();
    console.log('✅ Successfully seeded fuel stations!');
    
    // Verify the data
    const snapshot = await stationsRef.get();
    console.log(`📊 Total stations in database: ${snapshot.docs.length}`);
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      console.log(`   - ${data.name} (${data.brand}): ${data.location.address}`);
    });
    
  } catch (error) {
    console.error('❌ Error seeding fuel stations:', error);
    process.exit(1);
  }
}

seedFuelStations().then(() => {
  console.log('🎉 Seeding complete!');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Seeding failed:', error);
  process.exit(1);
});