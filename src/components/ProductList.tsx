import React, { useEffect, useState } from "react";
import { getFirestore, collection, query, where, getDocs, onSnapshot, orderBy } from "firebase/firestore";
import { ProductCard } from "./ProductCard";
import { LoadingSpinner } from "./LoadingSpinner";
import { ErrorBoundary } from "./ErrorBoundary";
import type { V2Product } from "../types/product";
import { toJsDate } from "../utils/firestoreDate";

const db = getFirestore();

interface ProductListProps {
  vendorId: string;
  category?: string;
  searchTerm?: string;
  measurementType?: string;
}

export function ProductList({ 
  vendorId, 
  category, 
  searchTerm, 
  measurementType 
}: ProductListProps) {
  const [products, setProducts] = useState<V2Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!vendorId) {
      setProducts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const productsRef = collection(db, `vendors/${vendorId}/products`);
      
      // Build query with filters
      let q = query(productsRef, orderBy('createdAt', 'desc'));
      
      if (category) {
        q = query(q, where('category', '==', category));
      }
      
      if (measurementType) {
        q = query(q, where('measurementType', '==', measurementType));
      }
      
      // Set up real-time listener
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const productsList: V2Product[] = [];
          
          snapshot.forEach((doc) => {
            const data = doc.data();
            
            // Validate V2 product structure
            if (data.measurementType && data.basePrice !== undefined) {
              productsList.push({
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate() || new Date(),
                updatedAt: data.updatedAt?.toDate() || new Date()
              } as V2Product);
            }
          });
          
          // Apply client-side search filter if needed
          const filteredProducts = searchTerm
            ? productsList.filter(product =>
                product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                product.description?.toLowerCase().includes(searchTerm.toLowerCase())
              )
            : productsList;
          
          setProducts(filteredProducts);
          setLoading(false);
        },
        (err) => {
          console.error("Product list error:", err);
          setError("Failed to load products. Please try again.");
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.error("Query setup error:", err);
      setError("Failed to setup product query.");
      setLoading(false);
    }
  }, [vendorId, category, searchTerm, measurementType]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner size="lg" />
        <span className="ml-3 text-gray-600">Loading products...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-600 font-medium">❌ {error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!products.length) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
        <div className="text-gray-400 text-6xl mb-4">🍽️</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No products available
        </h3>
        <p className="text-gray-500">
          {searchTerm 
            ? `No products found matching "${searchTerm}"`
            : "This vendor hasn't added any products yet"}
        </p>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="product-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-4">
        {products.map((product) => (
          <ProductCard 
            key={product.id} 
            product={product} 
            vendorId={vendorId}
            className="transform hover:scale-105 transition-transform duration-200"
          />
        ))}
      </div>
      
      {/* Results summary */}
      <div className="text-center mt-6 text-sm text-gray-500">
        Showing {products.length} product{products.length !== 1 ? 's' : ''}
        {category && ` in ${category}`}
        {measurementType && ` (${measurementType})`}
      </div>
    </ErrorBoundary>
  );
}