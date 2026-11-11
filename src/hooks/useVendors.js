// 🚀 GO7 VENDOR HOOKS — Real-time Vendor Data (Nov 2025)
// Fetches vendors from Firestore with filters and real-time updates

import { useState, useEffect } from 'react';
import { db } from '../config/firebase';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  getDocs,
} from 'firebase/firestore';

/**
 * Get all vendors with real-time updates
 * @param {Object} filters - Optional filters { vendorType, isOnline, rating }
 * @returns {Object} { vendors, loading, error }
 */
export function useVendors(filters = {}) {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    try {
      const vendorsRef = collection(db, 'vendors');
      let q = query(vendorsRef);

      // Apply filters
      if (filters.vendorType) {
        q = query(q, where('vendorType', '==', filters.vendorType));
      }

      if (filters.isOnline !== undefined) {
        q = query(q, where('isOnline', '==', filters.isOnline));
      }

      if (filters.minRating) {
        q = query(q, where('rating', '>=', filters.minRating));
      }

      if (filters.orderBy) {
        q = query(q, orderBy(filters.orderBy, filters.orderDirection || 'desc'));
      }

      if (filters.limit) {
        q = query(q, limit(filters.limit));
      }

      // Real-time listener
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const vendorsList = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setVendors(vendorsList);
          setLoading(false);
        },
        (err) => {
          console.error('Error fetching vendors:', err);
          setError(err.message);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.error('Error setting up vendors listener:', err);
      setError(err.message);
      setLoading(false);
    }
  }, [
    filters.vendorType,
    filters.isOnline,
    filters.minRating,
    filters.orderBy,
    filters.orderDirection,
    filters.limit,
  ]);

  return { vendors, loading, error };
}

/**
 * Get popular vendors near user
 * Sorted by rating (high to low)
 */
export function usePopularVendors(limitCount = 10) {
  return useVendors({
    isOnline: true,
    orderBy: 'rating',
    orderDirection: 'desc',
    limit: limitCount,
  });
}

/**
 * Get new vendors (recently added)
 */
export function useNewVendors(limitCount = 10) {
  return useVendors({
    isOnline: true,
    orderBy: 'createdAt',
    orderDirection: 'desc',
    limit: limitCount,
  });
}

/**
 * Get top-rated vendors (4.5+)
 */
export function useTopRatedVendors(limitCount = 10) {
  return useVendors({
    isOnline: true,
    minRating: 4.5,
    orderBy: 'rating',
    orderDirection: 'desc',
    limit: limitCount,
  });
}

/**
 * Get vendors by category
 */
export function useVendorsByCategory(category) {
  return useVendors({
    vendorType: category,
    isOnline: true,
  });
}

/**
 * Search vendors by name
 * @param {string} searchTerm - Search query
 */
export function useVendorSearch(searchTerm) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!searchTerm || searchTerm.trim().length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);

    const vendorsRef = collection(db, 'vendors');
    const q = query(vendorsRef);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allVendors = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Client-side filtering for name and category search
      const searchLower = searchTerm.toLowerCase();
      const filtered = allVendors.filter((vendor) => {
        const nameMatch = vendor.name?.toLowerCase().includes(searchLower);
        const categoryMatch = vendor.vendorType?.toLowerCase().includes(searchLower);
        const categoriesMatch = vendor.categories?.some((cat) =>
          cat.toLowerCase().includes(searchLower)
        );
        return nameMatch || categoryMatch || categoriesMatch;
      });

      setResults(filtered);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [searchTerm]);

  return { results, loading };
}

/**
 * Get single vendor by ID
 */
export function useVendor(vendorId) {
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!vendorId) {
      setLoading(false);
      return;
    }

    const vendorRef = doc(db, 'vendors', vendorId);
    const unsubscribe = onSnapshot(
      vendorRef,
      (doc) => {
        if (doc.exists()) {
          setVendor({ id: doc.id, ...doc.data() });
        } else {
          setError('Vendor not found');
        }
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [vendorId]);

  return { vendor, loading, error };
}
