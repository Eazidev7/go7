import React from 'react';
import { 
  BoltIcon, 
  CurrencyDollarIcon, 
  MapPinIcon, 
  LockClosedIcon 
} from '@heroicons/react/24/outline';

const ValuePropositions = () => {
  const features = [
    {
      Icon: BoltIcon,
      title: 'Lightning Fast',
      description: 'Average delivery time of just 30 minutes. Your order arrives hot and fresh.'
    },
    {
      Icon: CurrencyDollarIcon,
      title: 'Best Prices',
      description: 'No hidden fees. Transparent pricing. Pay exactly what you see.'
    },
    {
      Icon: MapPinIcon,
      title: 'Real-time Tracking',
      description: 'Watch your rider\'s location live on the map. Know exactly when to expect delivery.'
    },
    {
      Icon: LockClosedIcon,
      title: 'Secure Payments',
      description: 'Powered by Paystack. Your payment information is 100% safe and secure.'
    }
  ];

  return (
    <section className="py-20 bg-gradient-to-br from-red-600 to-red-700 
                      text-white relative overflow-hidden">
      
      {/* Background Pattern (same as hero) */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Why Choose GO7?</h2>
          <p className="text-lg sm:text-xl text-white/90">
            The fastest, most reliable delivery service in Abeokuta
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => {
            const IconComponent = feature.Icon;
            return (
              <div 
                key={index}
                className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 
                         border border-white/20 transform transition-all 
                         duration-300 hover:scale-105 hover:bg-white/20"
              >
                <div className="w-16 h-16 bg-yellow-400 rounded-xl 
                             flex items-center justify-center mb-4 shadow-lg">
                  <IconComponent className="w-8 h-8 text-red-900" />
                </div>
                <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                <p className="text-white/90">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ValuePropositions;
