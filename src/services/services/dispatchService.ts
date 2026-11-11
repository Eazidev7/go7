import { 
  collection, 
  doc, 
  onSnapshot, 
  query, 
  where, 
  orderBy,
  getDocs,
  updateDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../firebase/config';

/**
 * Service for handling dispatch and delivery operations
 */

export interface Rider {
  id: string;
  name: string;
  phone: string;
  area: string;
  status: 'available' | 'busy' | 'offline';
  load: number;
  coords: {
    lat: number;
    lng: number;
  };
  vehicleType: 'motorcycle' | 'bicycle' | 'car';
  rating: number;
  totalDeliveries: number;
  lastSeen: Date;
}

export interface DeliveryJob {
  jobId: string;
  orderId: string;
  riderId: string;
  riderName: string;
  riderPhone: string;
  vendorId: string;
  customer: {
    name: string;
    phone: string;
  };
  areaFrom: string;
  areaTo: string;
  status: 'assigned' | 'picked_up' | 'in_transit' | 'completed' | 'cancelled';
  estimatedPickupTime: Date;
  estimatedDeliveryTime: Date;
  createdAt: Date;
  orderValue: number;
  actualPickupTime?: Date;
  actualDeliveryTime?: Date;
}

/**
 * Get all available riders in a specific area
 */
export const getAvailableRiders = async (area?: string): Promise<Rider[]> => {
  try {
    let ridersQuery = query(
      collection(db, 'riders_online'),
      where('status', '==', 'available'),
      orderBy('load', 'asc')
    );

    if (area) {
      ridersQuery = query(
        collection(db, 'riders_online'),
        where('area', '==', area),
        where('status', '==', 'available'),
        orderBy('load', 'asc')
      );
    }

    const snapshot = await getDocs(ridersQuery);
    const riders: Rider[] = [];

    snapshot.forEach(doc => {
      riders.push({
        id: doc.id,
        ...doc.data()
      } as Rider);
    });

    return riders;
  } catch (error) {
    console.error('Error fetching available riders:', error);
    throw error;
  }
};

/**
 * Get all riders with their current status
 */
export const getAllRiders = async (): Promise<Rider[]> => {
  try {
    const ridersQuery = query(
      collection(db, 'riders_online'),
      orderBy('lastSeen', 'desc')
    );

    const snapshot = await getDocs(ridersQuery);
    const riders: Rider[] = [];

    snapshot.forEach(doc => {
      riders.push({
        id: doc.id,
        ...doc.data()
      } as Rider);
    });

    return riders;
  } catch (error) {
    console.error('Error fetching all riders:', error);
    throw error;
  }
};

/**
 * Manually assign a rider to an order
 */
export const assignRiderToOrder = async (orderId: string): Promise<any> => {
  try {
    const assignRider = httpsCallable(functions, 'assignRider');
    const result = await assignRider({ orderId });
    return result.data;
  } catch (error) {
    console.error('Error assigning rider:', error);
    throw error;
  }
};

/**
 * Get active delivery jobs
 */
export const getActiveDeliveries = async (riderId?: string): Promise<DeliveryJob[]> => {
  try {
    let deliveriesQuery = query(
      collection(db, 'delivery_live'),
      where('status', 'in', ['assigned', 'picked_up', 'in_transit']),
      orderBy('createdAt', 'desc')
    );

    if (riderId) {
      deliveriesQuery = query(
        collection(db, 'delivery_live'),
        where('riderId', '==', riderId),
        where('status', 'in', ['assigned', 'picked_up', 'in_transit']),
        orderBy('createdAt', 'desc')
      );
    }

    const snapshot = await getDocs(deliveriesQuery);
    const deliveries: DeliveryJob[] = [];

    snapshot.forEach(doc => {
      deliveries.push({
        ...doc.data()
      } as DeliveryJob);
    });

    return deliveries;
  } catch (error) {
    console.error('Error fetching active deliveries:', error);
    throw error;
  }
};

/**
 * Update delivery status
 */
export const updateDeliveryStatus = async (
  jobId: string, 
  status: 'picked_up' | 'in_transit' | 'completed' | 'cancelled'
): Promise<void> => {
  try {
    const deliveryRef = doc(db, 'delivery_live', jobId);
    
    const updateData: any = {
      status,
      updatedAt: serverTimestamp()
    };

    // Add timestamp for specific status changes
    if (status === 'picked_up') {
      updateData.actualPickupTime = serverTimestamp();
    } else if (status === 'completed') {
      updateData.actualDeliveryTime = serverTimestamp();
    }

    await updateDoc(deliveryRef, updateData);
  } catch (error) {
    console.error('Error updating delivery status:', error);
    throw error;
  }
};

/**
 * Subscribe to rider status changes
 */
export const subscribeToRiderUpdates = (
  area: string,
  callback: (riders: Rider[]) => void
): (() => void) => {
  const ridersQuery = query(
    collection(db, 'riders_online'),
    where('area', '==', area),
    orderBy('lastSeen', 'desc')
  );

  return onSnapshot(ridersQuery, (snapshot) => {
    const riders: Rider[] = [];
    snapshot.forEach(doc => {
      riders.push({
        id: doc.id,
        ...doc.data()
      } as Rider);
    });
    callback(riders);
  });
};

/**
 * Subscribe to delivery job updates
 */
export const subscribeToDeliveryUpdates = (
  orderId: string,
  callback: (delivery: DeliveryJob | null) => void
): (() => void) => {
  const deliveryQuery = query(
    collection(db, 'delivery_live'),
    where('orderId', '==', orderId)
  );

  return onSnapshot(deliveryQuery, (snapshot) => {
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      callback({
        ...doc.data()
      } as DeliveryJob);
    } else {
      callback(null);
    }
  });
};

/**
 * Get delivery statistics for admin dashboard
 */
export const getDeliveryStats = async (timeframe: 'today' | '7d' | '30d' = 'today'): Promise<{
  totalDeliveries: number;
  completedDeliveries: number;
  averageDeliveryTime: number;
  activeRiders: number;
}> => {
  try {
    // Calculate start date based on timeframe
    const now = new Date();
    const startDate = new Date();
    
    switch (timeframe) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
    }

    // Get delivery jobs within timeframe
    const deliveriesQuery = query(
      collection(db, 'delivery_live'),
      orderBy('createdAt', 'desc')
    );

    const deliveriesSnapshot = await getDocs(deliveriesQuery);
    const deliveries: DeliveryJob[] = [];

    deliveriesSnapshot.forEach(doc => {
      const delivery = doc.data() as DeliveryJob;
      if (delivery.createdAt && delivery.createdAt >= startDate) {
        deliveries.push(delivery);
      }
    });

    // Get active riders
    const ridersQuery = query(
      collection(db, 'riders_online'),
      where('status', 'in', ['available', 'busy'])
    );

    const ridersSnapshot = await getDocs(ridersQuery);
    const activeRiders = ridersSnapshot.size;

    // Calculate statistics
    const totalDeliveries = deliveries.length;
    const completedDeliveries = deliveries.filter(d => d.status === 'completed').length;
    
    // Calculate average delivery time for completed deliveries
    const completedWithTimes = deliveries.filter(d => 
      d.status === 'completed' && 
      d.actualDeliveryTime && 
      d.estimatedPickupTime
    );

    let averageDeliveryTime = 0;
    if (completedWithTimes.length > 0) {
      const totalTime = completedWithTimes.reduce((sum, delivery) => {
        const startTime = delivery.estimatedPickupTime.getTime();
        const endTime = delivery.actualDeliveryTime!.getTime();
        return sum + (endTime - startTime);
      }, 0);
      
      averageDeliveryTime = totalTime / completedWithTimes.length / (1000 * 60); // Convert to minutes
    }

    return {
      totalDeliveries,
      completedDeliveries,
      averageDeliveryTime,
      activeRiders
    };
  } catch (error) {
    console.error('Error fetching delivery stats:', error);
    throw error;
  }
};
