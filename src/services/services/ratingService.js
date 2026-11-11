import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  runTransaction 
} from 'firebase/firestore';
import { db } from '../lib/firebase';

/**
 * Submit a delivery rating and update rider's profile
 * @param {Object} ratingData - Rating information
 * @param {string} ratingData.deliveryId - Delivery ID
 * @param {string} ratingData.riderId - Rider ID
 * @param {number} ratingData.rating - Star rating (1-5)
 * @param {string} ratingData.feedback - Optional text feedback
 * @param {Date} ratingData.timestamp - Rating timestamp
 * @returns {Promise<string>} Rating document ID
 */
export async function submitDeliveryRating(ratingData) {
  try {
    const { deliveryId, riderId, rating, feedback, timestamp } = ratingData;

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5 stars');
    }

    if (!deliveryId || !riderId) {
      throw new Error('Delivery ID and Rider ID are required');
    }

    // Use a transaction to ensure data consistency
    const result = await runTransaction(db, async (transaction) => {
      // Check if rating already exists for this delivery
      const existingRatingQuery = query(
        collection(db, 'ratings'),
        where('deliveryId', '==', deliveryId)
      );
      const existingRatingSnapshot = await getDocs(existingRatingQuery);
      
      if (!existingRatingSnapshot.empty) {
        throw new Error('Rating already submitted for this delivery');
      }

      // Get current rider data
      const riderRef = doc(db, 'users', riderId);
      const riderDoc = await transaction.get(riderRef);
      
      if (!riderDoc.exists()) {
        throw new Error('Rider not found');
      }

      const riderData = riderDoc.data();
      
      // Create rating document
      const ratingRef = doc(collection(db, 'ratings'));
      transaction.set(ratingRef, {
        deliveryId,
        riderId,
        rating,
        feedback: feedback || '',
        timestamp: serverTimestamp(),
        createdAt: serverTimestamp()
      });

      // Calculate new average rating
      const currentRatingCount = riderData.ratingCount || 0;
      const currentAverageRating = riderData.averageRating || 0;
      const newRatingCount = currentRatingCount + 1;
      const newAverageRating = ((currentAverageRating * currentRatingCount) + rating) / newRatingCount;

      // Update rider profile with new rating stats
      transaction.update(riderRef, {
        averageRating: Math.round(newAverageRating * 100) / 100, // Round to 2 decimal places
        ratingCount: newRatingCount,
        lastRatedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Update delivery document to mark as rated
      const deliveryRef = doc(db, 'deliveries', deliveryId);
      transaction.update(deliveryRef, {
        rated: true,
        ratedAt: serverTimestamp(),
        customerRating: rating,
        updatedAt: serverTimestamp()
      });

      return ratingRef.id;
    });

    console.log('✅ Rating submitted successfully:', result);
    return result;

  } catch (error) {
    console.error('❌ Error submitting rating:', error);
    throw error;
  }
}

/**
 * Get all ratings for a specific rider
 * @param {string} riderId - Rider ID
 * @returns {Promise<Array>} Array of rating objects
 */
export async function getRiderRatings(riderId) {
  try {
    const ratingsQuery = query(
      collection(db, 'ratings'),
      where('riderId', '==', riderId),
      orderBy('timestamp', 'desc')
    );

    const snapshot = await getDocs(ratingsQuery);
    const ratings = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate()
    }));

    return ratings;

  } catch (error) {
    console.error('❌ Error fetching rider ratings:', error);
    throw error;
  }
}

/**
 * Get rating for a specific delivery
 * @param {string} deliveryId - Delivery ID
 * @returns {Promise<Object|null>} Rating object or null if not found
 */
export async function getDeliveryRating(deliveryId) {
  try {
    const ratingsQuery = query(
      collection(db, 'ratings'),
      where('deliveryId', '==', deliveryId)
    );

    const snapshot = await getDocs(ratingsQuery);
    
    if (snapshot.empty) {
      return null;
    }

    const ratingDoc = snapshot.docs[0];
    return {
      id: ratingDoc.id,
      ...ratingDoc.data(),
      timestamp: ratingDoc.data().timestamp?.toDate()
    };

  } catch (error) {
    console.error('❌ Error fetching delivery rating:', error);
    throw error;
  }
}

/**
 * Get rider profile with rating statistics
 * @param {string} riderId - Rider ID
 * @returns {Promise<Object>} Rider profile with rating stats
 */
export async function getRiderProfile(riderId) {
  try {
    const riderRef = doc(db, 'users', riderId);
    const riderDoc = await getDoc(riderRef);

    if (!riderDoc.exists()) {
      throw new Error('Rider not found');
    }

    const riderData = riderDoc.data();
    
    return {
      id: riderId,
      ...riderData,
      averageRating: riderData.averageRating || 0,
      ratingCount: riderData.ratingCount || 0,
      lastRatedAt: riderData.lastRatedAt?.toDate()
    };

  } catch (error) {
    console.error('❌ Error fetching rider profile:', error);
    throw error;
  }
}

/**
 * Get recent ratings with delivery details
 * @param {number} limit - Number of ratings to fetch
 * @returns {Promise<Array>} Array of ratings with delivery info
 */
export async function getRecentRatings(limit = 10) {
  try {
    const ratingsQuery = query(
      collection(db, 'ratings'),
      orderBy('timestamp', 'desc')
    );

    const snapshot = await getDocs(ratingsQuery);
    const ratings = snapshot.docs.slice(0, limit).map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate()
    }));

    // Fetch delivery details for each rating
    const ratingsWithDetails = await Promise.all(
      ratings.map(async (rating) => {
        try {
          const deliveryRef = doc(db, 'deliveries', rating.deliveryId);
          const deliveryDoc = await getDoc(deliveryRef);
          
          if (deliveryDoc.exists()) {
            const deliveryData = deliveryDoc.data();
            return {
              ...rating,
              delivery: {
                pickupAddress: deliveryData.pickupAddress,
                dropoffAddress: deliveryData.dropoffAddress,
                completedAt: deliveryData.completedAt?.toDate()
              }
            };
          }
          
          return rating;
        } catch (error) {
          console.error(`Error fetching delivery ${rating.deliveryId}:`, error);
          return rating;
        }
      })
    );

    return ratingsWithDetails;

  } catch (error) {
    console.error('❌ Error fetching recent ratings:', error);
    throw error;
  }
}

/**
 * Check if a delivery has been rated
 * @param {string} deliveryId - Delivery ID
 * @returns {Promise<boolean>} True if rated, false otherwise
 */
export async function isDeliveryRated(deliveryId) {
  try {
    const rating = await getDeliveryRating(deliveryId);
    return rating !== null;
  } catch (error) {
    console.error('❌ Error checking if delivery is rated:', error);
    return false;
  }
}

/**
 * Get rating statistics for all riders
 * @returns {Promise<Array>} Array of rider stats
 */
export async function getRiderRatingStats() {
  try {
    const usersQuery = query(
      collection(db, 'users'),
      where('role', '==', 'rider'),
      orderBy('averageRating', 'desc')
    );

    const snapshot = await getDocs(usersQuery);
    const riders = snapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name || 'Unknown Rider',
      phone: doc.data().phone,
      averageRating: doc.data().averageRating || 0,
      ratingCount: doc.data().ratingCount || 0,
      lastRatedAt: doc.data().lastRatedAt?.toDate()
    }));

    return riders.filter(rider => rider.ratingCount > 0);

  } catch (error) {
    console.error('❌ Error fetching rider rating stats:', error);
    throw error;
  }
}