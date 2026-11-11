import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isRider, setIsRider] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  
  // Check if user is authenticated
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          const userData = userDoc.data();
          
          // Check if user has admin role
          if (userData && userData.role === 'admin') {
            setIsAdmin(true);
          } else {
            setIsAdmin(false);
          }
          
          // Check if user has rider role
          if (userData && (userData.role === 'rider' || userData.role === 'admin')) {
            setIsRider(true);
          } else {
            // For demo purposes, we'll allow all authenticated users to be riders
            setIsRider(true);
          }
        } catch (error) {
          console.error('Error checking user roles:', error);
          setIsAdmin(false);
          // For demo purposes, we'll allow all authenticated users to be riders
          setIsRider(true);
        }
      } else {
        setIsAdmin(false);
        setIsRider(false);
      }
      
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, []);
  
  const handleSignOut = async () => {
    const auth = getAuth();
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };
  
  return (
    <header className="bg-opacity-70 backdrop-blur-lg bg-white/70 fixed top-0 left-0 right-0 z-50 shadow-lg">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <div className="bg-white/80 rounded-lg p-2 shadow-sm backdrop-blur-sm">
              <img src="/go7-logo.png" alt="GO7 Delivery" className="h-10" />
            </div>
            <span className="ml-2 text-xl font-bold text-go7-red">GO7 Delivery</span>
          </Link>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-8 items-center">
            <Link to="/" className={`text-gray-700 hover:text-go7-red ${location.pathname === '/' ? 'font-semibold' : ''}`}>
              Home
            </Link>
            <Link to="/track" className={`text-gray-700 hover:text-go7-red ${location.pathname === '/track' ? 'font-semibold' : ''}`}>
              Track
            </Link>
            
            {user ? (
              <div className="relative">
                <button 
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="flex items-center text-gray-700 hover:text-go7-red"
                >
                  <span className="mr-1">{user.email?.split('@')[0]}</span>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {isMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white/80 backdrop-blur-lg rounded-md shadow-lg py-1 z-10 border border-gray-200/50">
                    {isAdmin && (
                      <Link 
                        to="/admin" 
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-red-50/70 transition-colors"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Admin Dashboard
                      </Link>
                    )}
                    {isRider && (
                      <Link 
                        to="/rider" 
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-red-50/70 transition-colors"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Rider Dashboard
                      </Link>
                    )}
                    <button 
                      onClick={() => {
                        handleSignOut();
                        setIsMenuOpen(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-red-50/70 transition-colors"
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link 
                to="/login" 
                className="px-4 py-2 text-white bg-go7-red/90 backdrop-blur-sm rounded-lg hover:bg-go7-red/100 transition-colors shadow-md hover:shadow-lg"
              >
                Sign In
              </Link>
            )}
          </nav>
          
          {/* Mobile Menu Button */}
          <button 
            className="md:hidden text-gray-500 focus:outline-none"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {isMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
        
        {/* Mobile Navigation */}
        {isMenuOpen && (
          <nav className="md:hidden mt-4 space-y-3 pb-3 bg-white/80 backdrop-blur-md rounded-lg p-4 shadow-lg border border-gray-200/50 animate-fadeIn">
            <Link 
              to="/" 
              className="block text-gray-700 hover:text-go7-red transition-colors py-2"
              onClick={() => setIsMenuOpen(false)}
            >
              Home
            </Link>
            <Link 
              to="/track" 
              className="block text-gray-700 hover:text-go7-red transition-colors py-2"
              onClick={() => setIsMenuOpen(false)}
            >
              Track
            </Link>
            
            {user ? (
              <>
                {isAdmin && (
                  <Link 
                    to="/admin" 
                    className="block text-gray-700 hover:text-go7-red transition-colors py-2"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Admin Dashboard
                  </Link>
                )}
                {isRider && (
                  <Link 
                    to="/rider" 
                    className="block text-gray-700 hover:text-go7-red transition-colors py-2"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Rider Dashboard
                  </Link>
                )}
                <button 
                  onClick={() => {
                    handleSignOut();
                    setIsMenuOpen(false);
                  }}
                  className="block w-full text-left text-gray-700 hover:text-go7-red transition-colors py-2"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <Link 
                to="/login" 
                className="block px-4 py-2 text-white bg-go7-red/90 backdrop-blur-sm rounded-lg hover:bg-go7-red/100 transition-colors shadow-md hover:shadow-lg w-full text-center mt-2"
                onClick={() => setIsMenuOpen(false)}
              >
                Sign In
              </Link>
            )}
          </nav>
        )}
      </div>
    </header>
  );
}

export default Header;
