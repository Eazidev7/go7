import React, { useEffect, useState, ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Vendor } from '../../types/marketplace';
import { updateVendorOnlineStatus } from '../../services/vendorAuthService';

// Icons
const HomeIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

const ProductsIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
  </svg>
);

const CategoriesIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
  </svg>
);

const OrdersIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
  </svg>
);

const PODIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const PayoutsIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const CouponsIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
  </svg>
);

const ConfigIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
  </svg>
);

const AddOnsIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
  </svg>
);

const SettingsIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const MenuIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

const CloseIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

interface VendorLayoutProps {
  children: ReactNode;
  vendor: Vendor | null;
  title?: string;
}

const VendorLayout: React.FC<VendorLayoutProps> = ({ 
  children, 
  vendor, 
  title = 'Vendor Dashboard' 
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(vendor?.isOnline !== false);
  const [statusSaving, setStatusSaving] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setIsOnline(vendor?.isOnline !== false);
  }, [vendor?.id, vendor?.isOnline]);

  const navigation = [
    { name: 'Overview', href: '/vendor/dashboard', icon: HomeIcon },
    { name: 'Products', href: '/vendor/products', icon: ProductsIcon },
    { name: 'Add-ons', href: '/vendor/addons', icon: AddOnsIcon },
    { name: 'Categories', href: '/vendor/categories', icon: CategoriesIcon },
    { name: 'Orders', href: '/vendor/orders', icon: OrdersIcon },
    { name: 'Coupons', href: '/vendor/coupons', icon: CouponsIcon },
    { name: 'Configuration', href: '/vendor/config', icon: ConfigIcon },
    { name: 'POD', href: '/vendor/pod', icon: PODIcon },
    { name: 'Payouts', href: '/vendor/payouts', icon: PayoutsIcon },
    { name: 'Settings', href: '/vendor/settings', icon: SettingsIcon },
  ];

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleOnlineToggle = async () => {
    const vendorId = vendor?.id;
    if (!vendorId || statusSaving) return;
    const next = !isOnline;
    setIsOnline(next);
    setStatusSaving(true);
    try {
      const result = await updateVendorOnlineStatus(vendorId, next);
      if (!result?.success) {
        setIsOnline(!next);
      }
    } catch (error) {
      console.error('Failed to update vendor online status:', error);
      setIsOnline(!next);
    } finally {
      setStatusSaving(false);
    }
  };

  return (
    <div className="h-screen flex overflow-hidden bg-gray-100">
      <Helmet>
        <title>{`${title} | Go7 Marketplace`}</title>
      </Helmet>

      {/* Mobile sidebar overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 flex md:hidden"
          onClick={toggleSidebar}
        >
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" aria-hidden="true"></div>
        </div>
      )}

      {/* Sidebar for mobile */}
      <div
        className={`fixed inset-y-0 left-0 flex flex-col flex-shrink-0 w-64 max-w-xs bg-white border-r border-gray-200 pt-5 pb-4 transform ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:hidden transition-transform duration-300 ease-in-out z-40`}
      >
        <div className="flex items-center justify-between flex-shrink-0 px-4">
          <div className="flex items-center">
            <img
              className="h-8 w-auto"
              src="/go7-logo.png"
              alt="Go7 Logo"
            />
            <span className="ml-2 text-xl font-bold text-gray-900">Go7 Vendor</span>
          </div>
          <button
            type="button"
            className="p-1 rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500"
            onClick={toggleSidebar}
            title="Toggle sidebar"
            aria-label="Toggle sidebar"
          >
            <CloseIcon />
          </button>
        </div>
        <div className="flex-1 mt-5 flex flex-col overflow-y-auto">
          <div className="px-4 mb-4">
            <div className="flex flex-col items-start space-y-2">
              <div className="text-sm font-medium text-gray-500">Vendor: {vendor?.name || 'Loading...'}</div>
              <div className="flex items-center">
                <label htmlFor="mobile-online-toggle" className="mr-2 text-sm font-medium text-gray-700">
                  Status:
                </label>
                <div className="flex items-center">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      id="mobile-online-toggle"
                      type="checkbox"
                      checked={isOnline}
                      onChange={handleOnlineToggle}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                    <span className="ml-2 text-sm font-medium text-gray-700">
                      {isOnline ? 'Online' : 'Offline'}
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4 px-2 space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`group flex items-center px-2 py-2 text-base font-medium rounded-md ${
                  location.pathname === item.href
                    ? 'bg-red-50 text-red-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <div
                  className={`mr-4 flex-shrink-0 ${
                    location.pathname === item.href
                      ? 'text-red-500'
                      : 'text-gray-400 group-hover:text-gray-500'
                  }`}
                >
                  <item.icon />
                </div>
                {item.name}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64">
          <div className="flex flex-col h-0 flex-1 border-r border-gray-200 bg-white">
            <div className="flex items-center h-16 flex-shrink-0 px-4 bg-white border-b border-gray-200">
              <img
                className="h-8 w-auto"
                src="/go7-logo.png"
                alt="Go7 Logo"
              />
              <span className="ml-2 text-xl font-bold text-gray-900">Go7 Vendor</span>
            </div>
            <div className="flex-1 flex flex-col overflow-y-auto">
              <div className="px-4 py-4">
                <div className="flex flex-col items-start space-y-2">
                  <div className="text-sm font-medium text-gray-500">Vendor: {vendor?.name || 'Loading...'}</div>
                  <div className="flex items-center">
                    <label htmlFor="desktop-online-toggle" className="mr-2 text-sm font-medium text-gray-700">
                      Status:
                    </label>
                    <div className="flex items-center">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          id="desktop-online-toggle"
                          type="checkbox"
                          checked={isOnline}
                          onChange={handleOnlineToggle}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                        <span className="ml-2 text-sm font-medium text-gray-700">
                          {isOnline ? 'Online' : 'Offline'}
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
              <nav className="flex-1 px-2 py-4 bg-white space-y-1">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                      location.pathname === item.href
                        ? 'bg-red-50 text-red-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <div
                      className={`mr-3 flex-shrink-0 h-6 w-6 ${
                        location.pathname === item.href
                          ? 'text-red-500'
                          : 'text-gray-400 group-hover:text-gray-500'
                      }`}
                    >
                      <item.icon />
                    </div>
                    {item.name}
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        {/* Top header */}
        <div className="relative z-10 flex-shrink-0 flex h-16 bg-white shadow">
          <button
            type="button"
            className="px-4 border-r border-gray-200 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-red-500 md:hidden"
            onClick={toggleSidebar}
            title="Toggle sidebar"
            aria-label="Toggle sidebar"
          >
            <MenuIcon />
          </button>
          <div className="flex-1 px-4 flex justify-between">
            <div className="flex-1 flex items-center">
              <h1 className="text-xl font-bold text-gray-900">{title}</h1>
            </div>
            <div className="ml-4 flex items-center md:ml-6">
              <button
                type="button"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Create Product
              </button>
            </div>
          </div>
        </div>

        {/* Main content area */}
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default VendorLayout;
