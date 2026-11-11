import React from 'react';

interface PricingPlan {
  id: string;
  name: string;
  baseFare: number;
  perKmRate: number;
  multiplier?: number;
  badges: string[];
  features: string[];
  popular?: boolean;
}

const PricingStrip = () => {
  const pricingPlans: PricingPlan[] = [
    {
      id: 'standard',
      name: 'Standard Delivery',
      baseFare: 300,
      perKmRate: 100,
      badges: ['2–3 hours', 'Tracking', 'Scheduling'],
      features: [
        'Real-time order tracking',
        'Scheduled delivery options',
        'Customer support',
        'Secure handling'
      ]
    },
    {
      id: 'express',
      name: 'Express Delivery',
      baseFare: 300,
      perKmRate: 100,
      multiplier: 1.5,
      badges: ['Under 60 mins', 'Priority routing'],
      features: [
        'Priority handling',
        'Faster route optimization',
        'Direct delivery',
        'Premium support'
      ],
      popular: true
    }
  ];

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const calculateFinalRate = (baseFare: number, perKmRate: number, multiplier?: number) => {
    const rate = multiplier ? perKmRate * multiplier : perKmRate;
    return { baseFare, rate };
  };

  return (
    <section className="py-12 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-[#1E1E1E] mb-2">
            Transparent Pricing
          </h2>
          <p className="text-[#6B7280]">
            Choose the delivery speed that works for you
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {pricingPlans.map((plan) => {
            const { baseFare, rate } = calculateFinalRate(plan.baseFare, plan.perKmRate, plan.multiplier);
            
            return (
              <div
                key={plan.id}
                className={`relative bg-white rounded-xl shadow-sm border p-6 transition-all duration-200 hover:shadow-md ${
                  plan.popular ? 'ring-2 ring-[#E53935] border-[#E53935]' : 'hover:border-gray-300'
                }`}
              >
                {/* Popular Badge */}
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-[#E53935] text-white px-4 py-1 rounded-full text-xs font-semibold">
                      Most Popular
                    </span>
                  </div>
                )}

                {/* Plan Header */}
                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold text-[#1E1E1E] mb-2">
                    {plan.name}
                  </h3>
                  
                  {/* Time/Speed Badges */}
                  <div className="flex flex-wrap justify-center gap-2 mb-4">
                    {plan.badges.map((badge, index) => (
                      <span
                        key={index}
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          plan.popular 
                            ? 'bg-[#FFF6F3] text-[#E53935] border border-[#E53935]' 
                            : 'bg-gray-100 text-[#6B7280]'
                        }`}
                      >
                        {badge}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Pricing Display */}
                <div className="text-center mb-6">
                  <div className="flex items-baseline justify-center space-x-1">
                    <span className="text-2xl font-bold text-[#1E1E1E]">
                      {formatPrice(baseFare)}
                    </span>
                    <span className="text-[#6B7280] text-sm">base</span>
                  </div>
                  <div className="flex items-baseline justify-center space-x-1 mt-1">
                    <span className="text-lg font-semibold text-[#1E1E1E]">
                      + {formatPrice(rate)}
                    </span>
                    <span className="text-[#6B7280] text-sm">/km</span>
                  </div>
                  
                  {plan.multiplier && (
                    <p className="text-xs text-[#6B7280] mt-2">
                      {plan.multiplier}x standard rate
                    </p>
                  )}
                </div>

                {/* Features List */}
                <div className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                        plan.popular ? 'bg-[#E53935]' : 'bg-[#109E49]'
                      }`}>
                        <svg
                          className="w-3 h-3 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                      <span className="text-[#1E1E1E] text-sm">
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Example Calculation */}
                <div className="mt-6 p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-[#6B7280] mb-1">Example: 5km delivery</p>
                  <p className="text-sm font-semibold text-[#1E1E1E]">
                    {formatPrice(baseFare + (rate * 5))}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Additional Info */}
        <div className="text-center mt-8">
          <p className="text-sm text-[#6B7280]">
            All prices include service fees. No hidden charges.
          </p>
        </div>
      </div>
    </section>
  );
};

export default PricingStrip;
