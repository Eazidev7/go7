import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCartIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

const FloatingCartIcon = () => {
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const [cartItems, setCartItems] = useState([]);
    const [isVisible, setIsVisible] = useState(true);
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        if (!currentUser) return;

        const cartQuery = query(
            collection(db, 'cart'),
            where('userId', '==', currentUser.uid)
        );

        const unsubscribe = onSnapshot(cartQuery, (snapshot) => {
            const items = [];
            snapshot.forEach((doc) => {
                items.push({ id: doc.id, ...doc.data() });
            });
            
            // Trigger animation when cart count changes
            if (items.length !== cartItems.length) {
                setIsAnimating(true);
                setTimeout(() => setIsAnimating(false), 300);
            }
            
            setCartItems(items);
        });

        return () => unsubscribe();
    }, [currentUser, cartItems.length]);

    const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

    const handleCartClick = () => {
        setIsAnimating(true);
        setTimeout(() => {
            navigate('/cart');
            setIsAnimating(false);
        }, 150);
    };

    // Hide cart icon on cart page
    useEffect(() => {
        const currentPath = window.location.pathname;
        setIsVisible(currentPath !== '/cart');
    }, []);

    if (!isVisible || !currentUser || totalItems === 0) return null;

    return (
        <div className="fixed bottom-6 right-6 z-50">
            <button
                onClick={handleCartClick}
                className={`
                    relative bg-red-600 hover:bg-red-700 text-white p-4 rounded-full shadow-lg
                    transform transition-all duration-300 hover:scale-110 active:scale-95
                    ${isAnimating ? 'animate-bounce' : ''}
                    focus:outline-none focus:ring-4 focus:ring-red-300
                    group overflow-hidden
                `}
                aria-label={`Shopping cart with ${totalItems} items`}
            >
                {/* Background pulse animation */}
                <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-75 group-hover:opacity-100"></div>
                
                {/* Cart icon */}
                <ShoppingCartIcon className="h-6 w-6 relative z-10" />
                
                {/* Item count badge */}
                <div className={`
                    absolute -top-2 -right-2 bg-yellow-400 text-red-900 text-xs font-bold
                    min-w-[20px] h-5 rounded-full flex items-center justify-center
                    transform transition-all duration-200
                    ${isAnimating ? 'scale-125' : 'scale-100'}
                    shadow-md border-2 border-white
                `}>
                    {totalItems > 99 ? '99+' : totalItems}
                </div>

                {/* Ripple effect on click */}
                <div className="absolute inset-0 rounded-full bg-white opacity-0 group-active:opacity-20 transition-opacity duration-150"></div>
            </button>

            {/* Tooltip */}
            <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block">
                <div className="bg-gray-900 text-white text-sm px-3 py-1 rounded-lg whitespace-nowrap">
                    {totalItems} item{totalItems !== 1 ? 's' : ''} in cart
                    <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                </div>
            </div>
        </div>
    );
};

export default FloatingCartIcon;