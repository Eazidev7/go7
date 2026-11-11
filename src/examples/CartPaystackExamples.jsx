/**
 * 🎨 Example Usage Page - How to Use CartPaystack
 * 
 * This shows how to integrate CartPaystack with your existing GO7 app
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../contexts/AuthContext';

/**
 * EXAMPLE 1: Using CartPaystack with Authentication Context
 */
function CartExample1() {
  const { currentUser, userData } = useAuthContext();
  
  return (
    <CartPaystack 
      userId={currentUser?.uid} 
      walletBalance={userData?.walletBalance || 0} 
    />
  );
}

/**
 * EXAMPLE 2: Using CartPaystack with localStorage wallet
 */
function CartExample2() {
  const userId = localStorage.getItem('userId');
  const walletBalance = parseFloat(localStorage.getItem('walletBalance')) || 0;
  
  return (
    <CartPaystack 
      userId={userId} 
      walletBalance={walletBalance} 
    />
  );
}

/**
 * EXAMPLE 3: Navigation button to cart
 */
function NavigateToCart() {
  const navigate = useNavigate();
  const cartCount = 3; // Get from CartContext or state
  
  return (
    <button 
      onClick={() => navigate('/cart-paystack')}
      className="relative bg-red-500 text-white px-6 py-3 rounded-full hover:bg-red-600 transition"
    >
      🛒 View Cart
      {cartCount > 0 && (
        <span className="absolute -top-2 -right-2 bg-yellow-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center">
          {cartCount}
        </span>
      )}
    </button>
  );
}

/**
 * EXAMPLE 4: Complete integration with MealBuilder
 */
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import toast from 'react-hot-toast';

async function addMealToCart(userId, mealData) {
  try {
    const cartRef = collection(db, "users", userId, "cart");
    
    await addDoc(cartRef, {
      vendorId: mealData.vendorId,
      mealId: mealData.mealId,
      mealName: mealData.name,
      quantity: mealData.quantity,
      basePrice: mealData.basePrice,
      unitLabel: mealData.unitLabel,
      addOns: mealData.addOns || [],
      total: mealData.total,
      timestamp: new Date()
    });
    
    toast.success("Added to cart! 🎉");
    
    // Optional: Navigate to cart
    // navigate('/cart-paystack');
    
  } catch (error) {
    console.error("Error adding to cart:", error);
    toast.error("Failed to add to cart");
  }
}

/**
 * EXAMPLE 5: Check if item already in cart before adding
 */
import { query, getDocs, where } from 'firebase/firestore';

async function addOrUpdateCart(userId, mealData) {
  try {
    const cartRef = collection(db, "users", userId, "cart");
    const q = query(cartRef, where("mealId", "==", mealData.mealId));
    const existingItems = await getDocs(q);
    
    if (!existingItems.empty) {
      // Item exists - update quantity
      const existingDoc = existingItems.docs[0];
      await updateDoc(doc(db, "users", userId, "cart", existingDoc.id), {
        quantity: existingDoc.data().quantity + mealData.quantity,
        total: existingDoc.data().total + mealData.total
      });
      toast.success("Cart updated!");
    } else {
      // Add new item
      await addDoc(cartRef, { ...mealData, timestamp: new Date() });
      toast.success("Added to cart!");
    }
  } catch (error) {
    toast.error("Error updating cart");
  }
}

/**
 * EXAMPLE 6: Wallet balance component
 */
function WalletBalance({ userId }) {
  const [balance, setBalance] = React.useState(0);
  
  React.useEffect(() => {
    // Fetch wallet balance from Firestore
    const fetchBalance = async () => {
      const userDoc = await getDoc(doc(db, "users", userId));
      setBalance(userDoc.data()?.walletBalance || 0);
    };
    fetchBalance();
  }, [userId]);
  
  return (
    <div className="bg-green-50 border border-green-200 rounded-xl p-4">
      <div className="flex items-center justify-between">
        <span className="text-gray-700">💰 Wallet Balance</span>
        <span className="text-2xl font-bold text-green-600">
          ₦{balance.toLocaleString()}
        </span>
      </div>
    </div>
  );
}

/**
 * EXAMPLE 7: Complete MealBuilder integration
 */
function MealBuilderWithCart() {
  const navigate = useNavigate();
  const { currentUser } = useAuthContext();
  
  const handleAddToCart = async () => {
    const cartItem = {
      vendorId: "vendor123",
      mealId: "meal456",
      name: "Jollof Rice",
      quantity: 2,
      basePrice: 500,
      unitLabel: "plate",
      addOns: [
        { name: "Chicken", price: 800, qty: 1 }
      ],
      total: 1800
    };
    
    await addMealToCart(currentUser.uid, cartItem);
    
    // Navigate to cart after 1 second
    setTimeout(() => {
      navigate('/cart-paystack');
    }, 1000);
  };
  
  return (
    <button onClick={handleAddToCart} className="bg-red-500 text-white px-8 py-4 rounded-xl">
      Add to Cart - ₦1,800
    </button>
  );
}

/**
 * 📋 Sample Firestore Security Rules
 * 
 * Add these to your Firebase Console > Firestore > Rules:
 */

/*
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Cart rules - users can only read/write their own cart
    match /users/{userId}/cart/{cartId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Orders rules - users can read their own orders
    match /orders/{orderId} {
      allow read: if request.auth != null && 
                     resource.data.userId == request.auth.uid;
      allow create: if request.auth != null;
    }
    
    // User wallet balance
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow update: if request.auth != null && 
                       request.auth.uid == userId &&
                       // Prevent direct wallet manipulation
                       request.resource.data.walletBalance >= 0;
    }
  }
}
*/

export {
  CartExample1,
  CartExample2,
  NavigateToCart,
  addMealToCart,
  addOrUpdateCart,
  WalletBalance,
  MealBuilderWithCart
};
