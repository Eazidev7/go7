import React, { useState, useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

function AdminGuard() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const location = useLocation();
  
  useEffect(() => {
    const auth = getAuth();
    let settled = false;

    const finish = (admin) => {
      if (settled) return;
      settled = true;
      setIsAdmin(admin);
      setIsLoading(false);
    };

    // Don't spin forever if Firebase/auth is slow
    const timeout = setTimeout(() => {
      console.warn('AdminGuard: auth check timed out');
      finish(false);
    }, 12000);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      clearTimeout(timeout);
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          const userData = userDoc.data();
          finish(userData?.role === 'admin');
        } catch (error) {
          console.error('Error checking admin status:', error);
          finish(false);
        }
      } else {
        finish(false);
      }
    });

    return () => {
      clearTimeout(timeout);
      unsubscribe();
    };
  }, []);
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
      </div>
    );
  }
  
  if (!isAdmin) {
    return <Navigate to={`/admin/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }
  
  return <Outlet />;
}

export default AdminGuard;
