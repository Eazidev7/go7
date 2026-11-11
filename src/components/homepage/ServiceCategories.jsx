import React from 'react';
import { useNavigate } from 'react-router-dom';

const ServiceCategories = () => {
  const navigate = useNavigate();

  const services = [
    {
      id: 'food',
      title: 'Food Delivery',
      description: 'From restaurants to your door in 30 minutes. Hot, fresh, and delicious.',
      icon: '🍔',
      stats: [
        { label: 'Restaurants', value: '200+' },
        { label: 'Avg Delivery', value: '30min' }
      ],
      buttonText: 'Order Food Now',
      route: '/explore?category=food',
      gradient: 'from-red-600 to-red-700',
      buttonStyle: 'bg-yellow-400 text-red-900 hover:bg-yellow-300',
      textColor: 'text-white',
      statsColor: 'text-white/80'
    },
    {
      id: 'grocery',
      title: 'Grocery Shopping',
      description: 'Fresh groceries delivered same day. We shop from your favorite stores.',
      icon: '🛒',
      stats: [
        { label: 'Grocery Stores', value: '50+' },
        { label: 'Avg Delivery', value: '45min' }
      ],
      buttonText: 'Shop Groceries',
      route: '/explore?category=groceries',
      gradient: 'from-white to-white',
      border: 'border-2 border-gray-200 hover:border-red-600',
      buttonStyle: 'bg-red-600 text-white hover:bg-red-700',
      textColor: 'text-gray-900',
      statsColor: 'text-gray-600',
      iconBg: 'bg-red-600'
    },
    {
      id: 'pharmacy',
      title: 'Pharmacy Delivery',
      description: 'Medications and health products delivered quickly and discreetly.',
      icon: '💊',
      stats: [
        { label: 'Pharmacies', value: '20+' },
        { label: 'Avg Delivery', value: '45min' }
      ],
      buttonText: 'Order Medicine',
      route: '/explore?category=pharmacy',
      gradient: 'from-red-50 to-red-100',
      buttonStyle: 'bg-red-600 text-white hover:bg-red-700',
      textColor: 'text-gray-900',
      statsColor: 'text-gray-700',
      iconBg: 'bg-red-600'
    },
    {
      id: 'delivery',
      title: 'Package Delivery',
      description: 'Send anything anywhere in Abeokuta. Fast, secure, tracked.',
      icon: '📦',
      stats: [
        { label: 'Daily Packages', value: '500+' },
        { label: 'Avg Delivery', value: '1hr' }
      ],
      buttonText: 'Book Delivery',
      route: '/book-delivery',
      gradient: 'from-yellow-400 to-yellow-500',
      buttonStyle: 'bg-red-600 text-white hover:bg-red-700',
      textColor: 'text-red-900',
      statsColor: 'text-red-900/80'
    },
    {
      id: 'fuel',
      title: 'Fuel & CNG Delivery',
      description: 'Fuel and CNG delivered to your location. Fast, safe, and reliable.',
      icon: '⛽',
      stats: [
        { label: 'Fuel Stations', value: '10+' },
        { label: 'Avg Delivery', value: '20min' }
      ],
      buttonText: 'Order Fuel',
      route: '/fuel-order',
      gradient: 'from-blue-500 to-blue-600',
      buttonStyle: 'bg-white text-blue-600 hover:bg-blue-50',
      textColor: 'text-white',
      statsColor: 'text-white/80'
    }
  ];

  return (
    <section className="py-20 bg-transparent">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            What Can We Deliver?
          </h2>
          <p className="text-lg sm:text-xl text-gray-600">
            From meals to medicine, we've got you covered
          </p>
        </div>

        {/* Services Grid - Responsive grid for all services */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map(service => (
            <div 
              key={service.id}
              onClick={() => navigate(service.route)}
              className={`group relative bg-gradient-to-br ${service.gradient} 
                        rounded-2xl p-6 overflow-hidden cursor-pointer
                        transform transition-all duration-300 hover:scale-105
                        shadow-xl hover:shadow-2xl ${service.border || ''}`}
            >
              {/* Background Pattern (same as hero - only for red gradients) */}
              {service.id === 'food' && (
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute inset-0" style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                  }}></div>
                </div>
              )}

              <div className={`relative z-10 ${service.textColor}`}>
                {/* Icon */}
                <div className={`w-14 h-14 ${service.iconBg || 'bg-yellow-400'} rounded-2xl 
                              flex items-center justify-center mb-4 
                              transform transition-transform group-hover:scale-110 
                              shadow-lg`}>
                  <span className="text-3xl">{service.icon}</span>
                </div>

                {/* Content */}
                <h3 className="text-xl font-bold mb-2">
                  {service.title}
                </h3>
                <p className={`${service.textColor === 'text-white' ? 'text-white/90' : 'text-gray-700'} 
                              text-sm mb-4`}>
                  {service.description}
                </p>

                {/* Stats */}
                <div className="flex items-center space-x-4 mb-4">
                  {service.stats.map((stat, idx) => (
                    <div key={idx}>
                      <div className={`text-lg font-bold ${
                        service.id === 'grocery' || service.id === 'pharmacy' 
                          ? 'text-red-600' 
                          : ''
                      }`}>
                        {stat.value}
                      </div>
                      <div className={`text-xs ${service.statsColor}`}>
                        {stat.label}
                      </div>
                    </div>
                  ))}
                </div>

                {/* CTA Button */}
                <button className={`${service.buttonStyle} px-4 py-2 
                                  rounded-xl font-semibold 
                                  transition-all duration-200 
                                  inline-flex items-center space-x-2
                                  shadow-lg hover:shadow-xl
                                  transform hover:scale-105 text-sm`}>
                  <span>{service.buttonText}</span>
                  <span className="transform group-hover:translate-x-1 transition-transform">
                    →
                  </span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServiceCategories;