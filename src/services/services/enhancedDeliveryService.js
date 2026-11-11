// Enhanced delivery service functions for vendor batch scheduling
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../lib/firebase';

// Get scheduled deliveries for admin/management
export async function getScheduledDeliveries() {
  try {
    const q = query(
      collection(db, "deliveries"),
      where("status", "==", "scheduled"),
      orderBy("pickupTime", "asc")
    );
    
    const snapshot = await getDocs(q);
    const deliveries = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      pickupTime: doc.data().pickupTime?.toDate() || new Date(doc.data().scheduledPickupTime)
    }));
    
    console.log(`📅 Found ${deliveries.length} scheduled deliveries`);
    return deliveries;
  } catch (error) {
    console.error('❌ Error getting scheduled deliveries:', error);
    throw error;
  }
}

// Get scheduled deliveries with time-based filtering
export async function getScheduledDeliveriesWithTimeFilter() {
  try {
    const now = new Date();
    const twentyMinutesFromNow = new Date(now.getTime() + 20 * 60 * 1000);
    
    const q = query(
      collection(db, "deliveries"),
      where("status", "in", ["scheduled", "delivery_scheduled"]),
      orderBy("pickupTime", "asc")
    );
    
    const snapshot = await getDocs(q);
    const allDeliveries = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      pickupTime: doc.data().pickupTime?.toDate() || new Date(doc.data().scheduledPickupTime)
    }));
    
    // Separate into scheduled (future) and ready for assignment
    const scheduled = allDeliveries.filter(delivery => 
      delivery.pickupTime > twentyMinutesFromNow
    );
    
    const readyForAssignment = allDeliveries.filter(delivery => 
      delivery.pickupTime <= twentyMinutesFromNow && delivery.pickupTime > now
    );
    
    console.log(`📅 Found ${scheduled.length} scheduled, ${readyForAssignment.length} ready for assignment`);
    return { scheduled, readyForAssignment };
  } catch (error) {
    console.error('❌ Error getting scheduled deliveries with time filter:', error);
    throw error;
  }
}

// Get grouped scheduled deliveries by vendor and pickup time
export async function getGroupedScheduledDeliveries() {
  try {
    const q = query(
      collection(db, "deliveries"),
      where("status", "in", ["scheduled", "delivery_scheduled"]),
      orderBy("pickupTime", "asc")
    );
    
    const snapshot = await getDocs(q);
    const deliveries = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      pickupTime: doc.data().pickupTime?.toDate() || new Date(doc.data().scheduledPickupTime)
    }));
    
    // Group deliveries by vendor and pickup time
    const grouped = {};
    
    deliveries.forEach(delivery => {
      const vendorKey = `${delivery.vendorId}_${delivery.vendorName || 'Unknown Vendor'}`;
      const pickupTimeKey = delivery.pickupTime.toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM
      const groupKey = `${vendorKey}_${pickupTimeKey}`;
      
      if (!grouped[groupKey]) {
        grouped[groupKey] = {
          vendor: {
            id: delivery.vendorId,
            name: delivery.vendorName || 'Unknown Vendor',
            phone: delivery.vendorPhone,
            address: delivery.pickupAddress
          },
          pickupTime: delivery.pickupTime,
          deliveries: [],
          totalOrders: 0,
          totalAmount: 0
        };
      }
      
      grouped[groupKey].deliveries.push(delivery);
      grouped[groupKey].totalOrders += 1;
      grouped[groupKey].totalAmount += delivery.totalAmount || 0;
    });
    
    // Convert to array and sort by pickup time
    const groupedArray = Object.values(grouped).sort((a, b) => a.pickupTime - b.pickupTime);
    
    console.log(`📅 Found ${deliveries.length} scheduled deliveries in ${groupedArray.length} groups`);
    return groupedArray;
  } catch (error) {
    console.error('❌ Error getting grouped scheduled deliveries:', error);
    throw error;
  }
}