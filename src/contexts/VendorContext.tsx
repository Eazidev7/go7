import React, { createContext, useState, useContext, useEffect } from 'react';
import { Vendor } from '../types/Vendor';
import { VendorService } from '../services/VendorService';

interface VendorContextType {
  currentVendor: Vendor | null;
  isLoading: boolean;
  error: string | null;
  setVendor: (vendor: Vendor | null) => void;
  loadVendor: (vendorId: string) => Promise<void>;
  clearVendor: () => void;
  vendorId: string | null;
}

// Create the context with a default value
const VendorContext = createContext<VendorContextType>({
  currentVendor: null,
  isLoading: false,
  error: null,
  setVendor: () => {},
  loadVendor: async () => {},
  clearVendor: () => {},
  vendorId: null
});

// Storage key for vendor ID
const VENDOR_ID_STORAGE_KEY = 'go7_current_vendor_id';

/**
 * Provider component for vendor context
 */
export const VendorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentVendor, setCurrentVendor] = useState<Vendor | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [vendorId, setVendorId] = useState<string | null>(null);

  // Load vendor ID from local storage on initial render
  useEffect(() => {
    const storedVendorId = localStorage.getItem(VENDOR_ID_STORAGE_KEY);
    if (storedVendorId) {
      setVendorId(storedVendorId);
      loadVendor(storedVendorId).catch(err => {
        console.error('Failed to load stored vendor:', err);
        clearVendor(); // Clear if we can't load the stored vendor
      });
    }
  }, []);

  /**
   * Load vendor data by ID
   */
  const loadVendor = async (id: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const vendor = await VendorService.getVendorById(id);
      
      if (vendor) {
        setCurrentVendor(vendor);
        setVendorId(id);
        localStorage.setItem(VENDOR_ID_STORAGE_KEY, id);
      } else {
        throw new Error('Vendor not found');
      }
    } catch (err) {
      console.error('Error loading vendor:', err);
      setError(err instanceof Error ? err.message : 'Failed to load vendor');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Set vendor data directly
   */
  const setVendor = (vendor: Vendor | null) => {
    setCurrentVendor(vendor);
    
    if (vendor) {
      setVendorId(vendor.id);
      localStorage.setItem(VENDOR_ID_STORAGE_KEY, vendor.id);
    } else {
      clearVendor();
    }
  };

  /**
   * Clear vendor data
   */
  const clearVendor = () => {
    setCurrentVendor(null);
    setVendorId(null);
    localStorage.removeItem(VENDOR_ID_STORAGE_KEY);
  };

  return (
    <VendorContext.Provider
      value={{
        currentVendor,
        isLoading,
        error,
        setVendor,
        loadVendor,
        clearVendor,
        vendorId
      }}
    >
      {children}
    </VendorContext.Provider>
  );
};

/**
 * Custom hook to use the vendor context
 */
export const useVendor = () => useContext(VendorContext);
