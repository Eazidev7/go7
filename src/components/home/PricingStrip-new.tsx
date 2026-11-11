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

const PricingStrip: React.FC = () => {
  const pricingPlans: PricingPlan[] = [
    {
      id: 'standard',
      name: 'Standard Delivery',
      baseFare: 300,
      perKmRate: 100,
      badges: ['30-45 mins', 'Regular Speed'],
      features: [
        'Real-time tracking',
        'Photo confirmation',
        'Standard support',
        'Insurance covered',
        'Weekend delivery'
      ]
    },
    {
      id: 'express',
      name: 'Express Delivery',
      baseFare: 500,
      perKmRate: 150,
      multiplier: 1.5,
      badges: ['15-25 mins', 'Priority Speed'],
      features: [
        'Priority handling',
        'Live GPS tracking', 
        'Photo & video proof',
        'Premium support',
        '24/7 availability',
        'Express insurance'
      ],
      popular: true
    }
  ];

  const calculateExample = (plan: PricingPlan, distance: number = 5) => {
    const distanceCost = distance * plan.perKmRate;
    const total = plan.baseFare + distanceCost;
    return total;
  };

  const formatPrice = (amount: number): string => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Transparent Pricing Plans
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Choose the delivery speed that works for you. No hidden fees, no surprises.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {pricingPlans.map((plan) => (
            <div
              key={plan.id}
              className={`relative bg-white rounded-2xl shadow-lg border-2 p-8 transition-all duration-300 hover:shadow-xl ${
                plan.popular 
                  ? 'border-[#E53935] ring-4 ring-[#E53935] ring-opacity-20' 
                  : 'border-gray-200 hover:border-[#E53935]'
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
                      className="bg-[#FFF6F3] text-[#E53935] px-3 py-1 rounded-full text-xs font-medium"
                    >
                      {badge}
                    </span>
                  ))}
                </div>

                {/* Pricing */}
                <div className="mb-4">
                  <div className="text-2xl font-bold text-[#E53935] mb-1">
                    {formatPrice(plan.baseFare)} base
                  </div>
                  <div className="text-gray-600 text-sm">
                    + {formatPrice(plan.perKmRate)}/km
                  </div>
                </div>

                {/* Example calculation */}
                <div className="bg-[#FFF6F3] rounded-lg p-3 mb-6">
                  <p className="text-sm text-gray-600 mb-1">5km delivery example:</p>
                  <p className="text-lg font-semibold text-[#E53935]">
                    {formatPrice(calculateExample(plan))}
                  </p>
                </div>
              </div>

              {/* Features */}
              <div className="space-y-3 mb-8">
                <h4 className="font-semibold text-gray-900 text-sm uppercase tracking-wide">
                  What's Included:
                </h4>
                {plan.features.map((feature, index) => (
                  <div key={index} className="flex items-start">
                    <span className="text-[#109E49] mr-2 mt-0.5">✓</span>
                    <span className="text-gray-600 text-sm">{feature}</span>
                  </div>
                ))}
              </div>

              {/* CTA Button */}
              <button 
                className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors duration-200 ${
                  plan.popular
                    ? 'bg-[#E53935] hover:bg-[#B71C1C] text-white shadow-lg'
                    : 'bg-gray-100 hover:bg-[#E53935] hover:text-white text-gray-900'
                }`}
              >
                Choose {plan.name}
              </button>
            </div>
          ))}
        </div>

        {/* Bottom Note */}
        <div className="text-center mt-10">
          <p className="text-gray-600 text-sm max-w-2xl mx-auto">
            * All prices include service fee. Express delivery available 24/7. 
            Standard delivery operates 6AM-10PM daily. Additional charges may apply for special items or remote locations.
          </p>
        </div>
      </div>
    </section>
  );
};

export default PricingStrip;
