// 🛠️ GO7 BOTTOM NAVIGATION - ORIGINAL DESIGN
// Exact replica of the Go7 mobile bottom nav shown in the photo
// Features: White bar, red active tab, icon+text layout

import React, { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { FaHome, FaBox, FaMapMarkerAlt, FaComments, FaUser, FaShoppingCart } from "react-icons/fa";
import { useAuth } from '../contexts/AuthContext';
import { useCartStore } from '../store/cartStore';
import "./BottomNav.css";

export default function BottomNav() {
  const navigate = useNavigate();
  const { isLoggedIn, isGuestMode } = useAuth();
  const { getItemCount } = useCartStore();
  const [cartItemCount, setCartItemCount] = useState(0);

  // Subscribe to cart changes
  useEffect(() => {
    const unsubscribe = useCartStore.subscribe(() => {
      setCartItemCount(getItemCount());
    });
    
    // Initial count
    setCartItemCount(getItemCount());
    
    return unsubscribe;
  }, [getItemCount]);

  const handleProfileClick = (e) => {
    e.preventDefault();
    // If not logged in or in guest mode, go to onboarding
    if (!isLoggedIn || isGuestMode()) {
      navigate('/onboarding');
    } else {
      navigate('/profile');
    }
  };

  return (
    <nav className="go7-bottom-nav">
      <NavLink to="/" className="nav-item" end>
        <FaHome />
        <span>Explore Go7</span>
      </NavLink>
      <NavLink to="/orders" className="nav-item">
        <FaBox />
        <span>Orders</span>
      </NavLink>
      <NavLink to="/cart" className="nav-item">
        <div style={{ position: 'relative' }}>
          <FaShoppingCart />
          {cartItemCount > 0 && (
            <span style={{
              position: 'absolute',
              top: '-8px',
              right: '-8px',
              backgroundColor: '#E0001B',
              color: 'white',
              borderRadius: '50%',
              width: '16px',
              height: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              fontWeight: '600'
            }}>
              {cartItemCount}
            </span>
          )}
        </div>
        <span>Cart</span>
      </NavLink>
      <NavLink to="/track" className="nav-item">
        <FaMapMarkerAlt />
        <span>Track</span>
      </NavLink>
      <NavLink to="/chat" className="nav-item">
        <FaComments />
        <span>Chat</span>
      </NavLink>
      {/* Profile tab: intercept click to show onboarding for unauthenticated users */}
      <a href="/profile" className="nav-item" onClick={handleProfileClick}>
        <FaUser />
        <span>Profile</span>
      </a>
    </nav>
  );
}
