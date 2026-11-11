import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, 
  Wallet, 
  Edit3, 
  Phone, 
  Mail, 
  Calendar,
  Plus,
  Camera,
  ArrowLeft
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../config/firebase';
import { doc, getDoc, updateDoc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import PointsDisplay from '../components/PointsDisplay';

export default function Profile() {
    console.log('🟢 Profile component rendering!');
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    
    // State management
    const [userData, setUserData] = useState(null);
    const [walletData, setWalletData] = useState({ balance: 0, lastTopUp: null });
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [editForm, setEditForm] = useState({
        displayName: '',
        phoneNumber: ''
    });

    // Redirect to onboarding if not authenticated
    useEffect(() => {
        // Wait for auth to finish loading
        if (authLoading) return;
        
        // If no user after loading, redirect to onboarding
        if (!user?.uid) {
            navigate('/onboarding', { replace: true });
        }
    }, [user, authLoading, navigate]);

    // Fetch user data from Firestore
    useEffect(() => {
        if (!user?.uid) {
            setLoading(false);
            return;
        }

        const userRef = doc(db, 'users', user.uid);
        const walletRef = doc(db, 'wallets', user.uid);
        
        // Real-time listener for user data
        const unsubscribeUser = onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setUserData(data);
                setEditForm({
                    displayName: data.displayName || user.displayName || '',
                    phoneNumber: data.phoneNumber || ''
                });
            } else {
                // Create user document if it doesn't exist
                createUserDocument();
            }
            setLoading(false);
        });

        // Real-time listener for wallet data
        const unsubscribeWallet = onSnapshot(walletRef, 
            (walletSnap) => {
                if (walletSnap.exists()) {
                    const walletInfo = walletSnap.data();
                    setWalletData({ 
                        balance: walletInfo.balance || 0, 
                        lastTopUp: walletInfo.updatedAt 
                    });
                } else {
                    // Wallet will be created by WalletAutoSetup or WalletComponent
                    setWalletData({ balance: 0, lastTopUp: null });
                }
            },
            (error) => {
                console.error('❌ Error loading wallet:', error);
                setWalletData({ balance: 0, lastTopUp: null });
            }
        );

        return () => {
            unsubscribeUser();
            unsubscribeWallet();
        };
    }, [user]);

    // Create user document in Firestore
    const createUserDocument = async () => {
        if (!user?.uid) return;

        try {
            const userRef = doc(db, 'users', user.uid);
            const initialData = {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName || '',
                phoneNumber: user.phoneNumber || '',
                photoURL: user.photoURL || '',
                wallet: {
                    balance: 0,
                    lastTopUp: null,
                    lastTopUpAmount: 0,
                    lastTopUpReference: ''
                },
                createdAt: new Date(),
                updatedAt: new Date(),
                userType: 'customer',
                isActive: true
            };

            await updateDoc(userRef, initialData, { merge: true });
            console.log('✅ User document created');
        } catch (error) {
            console.error('❌ Error creating user document:', error);
        }
    };

    // Handle profile editing
    const handleEditProfile = () => {
        setIsEditing(true);
    };

    const handleSaveProfile = async () => {
        if (!user?.uid) return;

        try {
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
                displayName: editForm.displayName,
                phoneNumber: editForm.phoneNumber,
                updatedAt: new Date()
            });

            setIsEditing(false);
            console.log('✅ Profile updated successfully');
        } catch (error) {
            console.error('❌ Error updating profile:', error);
            alert('Failed to update profile. Please try again.');
        }
    };

    const handleCancelEdit = () => {
        setEditForm({
            displayName: userData?.displayName || user?.displayName || '',
            phoneNumber: userData?.phoneNumber || ''
        });
        setIsEditing(false);
    };

    // Format currency
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN',
            minimumFractionDigits: 0
        }).format(amount || 0);
    };

    // Format date
    const formatDate = (date) => {
        if (!date) return 'Never';
        
        const dateObj = date.toDate ? date.toDate() : new Date(date);
        return dateObj.toLocaleDateString('en-NG', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    // Loading state
    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E50914] mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading profile...</p>
                </div>
            </div>
        );
    }

    const menuItems = [
        { icon: '👤', label: 'Personal Information', path: '/profile/personal' },
        { icon: '📍', label: 'Saved Addresses', path: '/profile/addresses' },
        { icon: '💳', label: 'Payment Methods', path: '/profile/payment' },
        { icon: '�', label: 'Top Up Wallet', path: '/wallet/topup' },
        { icon: '�📦', label: 'Order History', path: '/orders' },
        { icon: '🏆', label: 'Go7 Points & Rewards', path: '/profile/points' },
        { icon: '⭐', label: 'Ratings & Reviews', path: '/profile/ratings' },
        { icon: '🎁', label: 'Promotions & Offers', path: '/profile/promotions' },
        { icon: '❓', label: 'Help & Support', path: '/profile/support' },
        { icon: '⚙️', label: 'Settings', path: '/profile/settings' },
    ];

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <div className="bg-gradient-to-r from-red-600 to-red-700 p-6 text-white">
                <div className="flex items-center mb-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="mr-3 p-2 rounded-full hover:bg-red-500 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h1 className="text-xl font-bold">Profile</h1>
                </div>

                {/* Enhanced User Info Section */}
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 mt-6">
                    <div className="flex items-center gap-4">
                        {/* Profile Photo */}
                        <div className="relative">
                            <div className="w-16 h-16 bg-white/20 rounded-full overflow-hidden flex items-center justify-center border-2 border-white/30">
                                {(user?.photoURL || userData?.photoURL) ? (
                                    <img 
                                        src={user?.photoURL || userData?.photoURL} 
                                        alt="Profile" 
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            console.log('Avatar load failed, using fallback');
                                            e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(userData?.displayName || user?.displayName || user?.email || 'User')}&background=e50914&color=white&size=64&font-size=0.6&rounded=true`;
                                        }}
                                        onLoad={() => console.log('Avatar loaded successfully')}
                                    />
                                ) : (
                                    <img 
                                        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(userData?.displayName || user?.displayName || user?.email || 'User')}&background=e50914&color=white&size=64&font-size=0.6&rounded=true`}
                                        alt="Profile" 
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            console.log('Fallback avatar failed, using default');
                                            e.target.style.display = 'none';
                                            e.target.parentNode.innerHTML = '<User className="w-8 h-8 text-white" />';
                                        }}
                                    />
                                )}
                            </div>
                            <button 
                                className="absolute -bottom-1 -right-1 bg-white text-[#E50914] rounded-full p-1.5 shadow-lg hover:shadow-xl transition-all"
                                onClick={() => console.log('Avatar change clicked')}
                            >
                                <Camera className="w-3 h-3" />
                            </button>
                        </div>

                        {/* User Details */}
                        <div className="flex-1">
                            {!isEditing ? (
                                <>
                                    <h2 className="text-lg font-semibold">
                                        {userData?.displayName || user?.displayName || 'Guest User'}
                                    </h2>
                                    {user?.email && (
                                        <div className="flex items-center gap-2 text-red-100 text-sm mt-1">
                                            <Mail className="w-4 h-4" />
                                            <span>{user.email}</span>
                                        </div>
                                    )}
                                    {userData?.phoneNumber && (
                                        <div className="flex items-center gap-2 text-red-100 text-sm mt-1">
                                            <Phone className="w-4 h-4" />
                                            <span>{userData.phoneNumber}</span>
                                        </div>
                                    )}
                                    {!user && (
                                        <p className="text-red-100">Sign in to access all features</p>
                                    )}
                                </>
                            ) : (
                                <div className="space-y-2">
                                    <input
                                        type="text"
                                        value={editForm.displayName}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, displayName: e.target.value }))}
                                        placeholder="Your name"
                                        className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-red-200 focus:outline-none focus:border-white"
                                    />
                                    <input
                                        type="tel"
                                        value={editForm.phoneNumber}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, phoneNumber: e.target.value }))}
                                        placeholder="Phone number"
                                        className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-red-200 focus:outline-none focus:border-white"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Edit Button */}
                        {user && (
                            !isEditing ? (
                                <button
                                    onClick={handleEditProfile}
                                    className="bg-white/20 p-2 rounded-full hover:bg-white/30 transition-colors"
                                >
                                    <Edit3 className="w-5 h-5" />
                                </button>
                            ) : (
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleSaveProfile}
                                        className="bg-green-600 px-3 py-1 rounded-lg text-sm font-medium"
                                    >
                                        Save
                                    </button>
                                    <button
                                        onClick={handleCancelEdit}
                                        className="bg-white/20 px-3 py-1 rounded-lg text-sm font-medium"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            )
                        )}
                    </div>
                </div>
            </div>

            <div className="p-4">
                {/* Go7 Points Preview */}
                <div className="mb-6">
                    <PointsDisplay showDetails={false} />
                </div>

                {/* Wallet Section */}
                {user && (
                    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="bg-green-100 rounded-full p-2">
                                    <Wallet className="w-5 h-5 text-green-600" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900">Wallet Balance</h3>
                                    <p className="text-sm text-gray-500">Available funds</p>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    console.log('🔄 Profile: Add Money button clicked');
                                    console.log('📱 Current user:', user);
                                    console.log('🧭 Navigating to: /wallet/topup');
                                    try {
                                        navigate('/wallet/topup');
                                        console.log('✅ Navigation successful');
                                    } catch (error) {
                                        console.error('❌ Navigation failed:', error);
                                    }
                                }}
                                className="bg-[#E50914] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#CC0812] transition-colors flex items-center gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                Add Money
                            </button>
                        </div>

                        <div className="mb-4">
                            <p className="text-3xl font-bold text-gray-900">
                                {formatCurrency(walletData.balance)}
                            </p>
                            {walletData.lastTopUp && (
                                <div className="flex items-center gap-2 text-sm text-gray-500 mt-2">
                                    <Calendar className="w-4 h-4" />
                                    <span>Last top-up: {formatDate(walletData.lastTopUp)}</span>
                                </div>
                            )}
                        </div>

                        {walletData.lastTopUpAmount > 0 && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                <p className="text-sm text-green-800">
                                    <strong>Recent:</strong> Added {formatCurrency(walletData.lastTopUpAmount)}
                                    {walletData.lastTopUpReference && (
                                        <span className="block text-xs text-green-600 mt-1">
                                            Ref: {walletData.lastTopUpReference}
                                        </span>
                                    )}
                                </p>
                            </div>
                        )}
                    </div>
                )}

                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                    {menuItems.map((item, index) => (
                        <button
                            key={index}
                            onClick={() => item.path && navigate(item.path)}
                            className="w-full flex items-center p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors text-left"
                        >
                            <span className="text-2xl mr-4">{item.icon}</span>
                            <span className="flex-1 font-medium text-gray-900">{item.label}</span>
                            <span className="text-gray-400">›</span>
                        </button>
                    ))}
                </div>

                {/* Authentication Controls */}
                <div className="mt-6">
                    {user ? (
                        <button 
                            onClick={() => {
                                if (user.logout) {
                                    user.logout();
                                }
                                navigate('/');
                            }}
                            className="w-full bg-red-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-red-700 transition-colors"
                        >
                            Sign Out
                        </button>
                    ) : (
                        <button 
                            onClick={() => navigate('/login')}
                            className="w-full bg-red-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-red-700 transition-colors"
                        >
                            Sign In / Sign Up
                        </button>
                    )}
                </div>

                <div className="mt-4 text-center">
                    <p className="text-sm text-gray-500">Version 1.0.0</p>
                </div>
            </div>
        </div>
    );
}
