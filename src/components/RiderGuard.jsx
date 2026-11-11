import React, { useState, useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

function RiderGuard() {
  const [isLoading, setIsLoading] = useState(true);
  const [isRider, setIsRider] = useState(false);
  const location = useLocation();
  
  useEffect(() => {
    const auth = getAuth();
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          const userData = userDoc.data();
          if (userData && (userData.role === 'rider' || userData.role === 'admin')) {
            setIsRider(true);
          } else {
            setIsRider(false);
          }
        } catch (error) {
          console.error('Error checking rider status:', error);
          setIsRider(false);
        }
      } else {
        setIsRider(false);
      }
      
      setIsLoading(false);
    });
    
    return () => unsubscribe();
  }, []);
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
      </div>
    );
  }
  
  if (!isRider) {
    // Redirect to login with return URL
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }
  
  return <Outlet />;
}

export default RiderGuard;
