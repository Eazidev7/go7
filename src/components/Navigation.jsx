import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    Bars3Icon,
    XMarkIcon,
    HomeIcon,
    MagnifyingGlassIcon,
    ShoppingBagIcon,
    WalletIcon,
    CogIcon,
    UserIcon,
    ArrowRightOnRectangleIcon,
    BuildingStorefrontIcon
} from '@heroicons/react/24/outline';

const Navigation = () => {
    const { currentUser, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);

    // Handle scroll effect
    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Close mobile menu on route change
    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [location]);

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/');
        } catch (error) {
            console.error('Failed to log out:', error);
        }
    };

    const navigationItems = [
        { path: '/', icon: HomeIcon, label: 'Home' },
        { path: '/explore', icon: MagnifyingGlassIcon, label: 'Explore' },
        { path: '/vendor/products', icon: BuildingStorefrontIcon, label: 'My Store' },
        { path: '/cart', icon: ShoppingBagIcon, label: 'Cart' },
        { path: '/vendor-wallet', icon: WalletIcon, label: 'Wallet' },
        { path: '/admin', icon: CogIcon, label: 'Admin' }
    ];

    const isActivePath = (path) => {
        if (path === '/') return location.pathname === '/';
        return location.pathname.startsWith(path);
    };

    return (
        <>
            {/* Desktop Navigation */}
            <nav className={`
                fixed top-0 left-0 right-0 z-40 transition-all duration-300
                ${isScrolled 
                    ? 'bg-white/95 backdrop-blur-md shadow-lg' 
                    : 'bg-white'
                }
            `}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        {/* Logo */}
                        <Link to="/" className="flex items-center space-x-3 group">
                            <div className="bg-red-600 p-2 rounded-lg group-hover:bg-red-700 transition-colors duration-200">
                                <img 
                                    src="/go7-logo.png" 
                                    alt="Go7" 
                                    className="h-8 w-8 text-white"
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                        e.target.nextSibling.style.display = 'block';
                                    }}
                                />
                                <span className="hidden text-white font-bold text-xl">Go7</span>
                            </div>
                            <span className="text-xl font-bold text-gray-900 group-hover:text-red-600 transition-colors duration-200">
                                Go7 Delivery
                            </span>
                        </Link>

                        {/* Desktop Navigation Items */}
                        <div className="hidden md:flex items-center space-x-1">
                            {navigationItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = isActivePath(item.path);
                                
                                return (
                                    <Link
                                        key={item.path}
                                        to={item.path}
                                        className={`
                                            flex items-center space-x-2 px-4 py-2 rounded-lg
                                            transition-all duration-200 group relative
                                            ${isActive 
                                                ? 'bg-red-50 text-red-600 font-medium' 
                                                : 'text-gray-600 hover:text-red-600 hover:bg-red-50'
                                            }
                                        `}
                                    >
                                        <Icon className="h-5 w-5" />
                                        <span className="text-sm">{item.label}</span>
                                        
                                        {/* Active indicator */}
                                        {isActive && (
                                            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-red-600 rounded-full"></div>
                                        )}
                                    </Link>
                                );
                            })}
                        </div>

                        {/* User Menu */}
                        <div className="hidden md:flex items-center space-x-4">
                            {currentUser ? (
                                <div className="flex items-center space-x-3">
                                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                                        <UserIcon className="h-4 w-4" />
                                        <span className="max-w-32 truncate">{currentUser.email}</span>
                                    </div>
                                    <button
                                        onClick={handleLogout}
                                        className="flex items-center space-x-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                                    >
                                        <ArrowRightOnRectangleIcon className="h-4 w-4" />
                                        <span>Logout</span>
                                    </button>
                                </div>
                            ) : (
                                <Link
                                    to="/login"
                                    className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors duration-200"
                                >
                                    Login
                                </Link>
                            )}
                        </div>

                        {/* Mobile menu button */}
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="md:hidden p-2 rounded-lg text-gray-600 hover:text-red-600 hover:bg-red-50 transition-colors duration-200"
                        >
                            {isMobileMenuOpen ? (
                                <XMarkIcon className="h-6 w-6" />
                            ) : (
                                <Bars3Icon className="h-6 w-6" />
                            )}
                        </button>
                    </div>
                </div>

                {/* Mobile Navigation Menu */}
                <div className={`
                    md:hidden transition-all duration-300 ease-in-out
                    ${isMobileMenuOpen 
                        ? 'max-h-screen opacity-100' 
                        : 'max-h-0 opacity-0 overflow-hidden'
                    }
                `}>
                    <div className="bg-white border-t border-gray-200 px-4 py-3 space-y-1">
                        {navigationItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = isActivePath(item.path);
                            
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    className={`
                                        flex items-center space-x-3 px-4 py-3 rounded-lg
                                        transition-all duration-200
                                        ${isActive 
                                            ? 'bg-red-50 text-red-600 font-medium border-l-4 border-red-600' 
                                            : 'text-gray-600 hover:text-red-600 hover:bg-red-50'
                                        }
                                    `}
                                >
                                    <Icon className="h-5 w-5" />
                                    <span>{item.label}</span>
                                </Link>
                            );
                        })}
                        
                        {/* Mobile User Section */}
                        <div className="border-t border-gray-200 pt-3 mt-3">
                            {currentUser ? (
                                <div className="space-y-2">
                                    <div className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-600">
                                        <UserIcon className="h-5 w-5" />
                                        <span className="truncate">{currentUser.email}</span>
                                    </div>
                                    <button
                                        onClick={handleLogout}
                                        className="w-full flex items-center space-x-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                                    >
                                        <ArrowRightOnRectangleIcon className="h-5 w-5" />
                                        <span>Logout</span>
                                    </button>
                                </div>
                            ) : (
                                <Link
                                    to="/login"
                                    className="w-full block text-center bg-red-600 text-white px-4 py-3 rounded-lg hover:bg-red-700 transition-colors duration-200"
                                >
                                    Login
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </nav>

            {/* Spacer to prevent content from going under fixed nav */}
            <div className="h-16"></div>

            {/* Mobile menu overlay */}
            {isMobileMenuOpen && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                ></div>
            )}
        </>
    );
};

export default Navigation;