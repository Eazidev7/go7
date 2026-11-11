import React, { useState } from 'react';

const ReferralBanner: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const referralCode = "GO7FRIEND";

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const benefits = [
    {
      icon: "💰",
      title: "₦500 Bonus",
      description: "For every friend you refer"
    },
    {
      icon: "🎁",
      title: "Free Delivery",
      description: "On your next 3 orders"
    },
    {
      icon: "⭐",
      title: "VIP Status",
      description: "Priority support & offers"
    }
  ];

  return (
    <section className="py-16 bg-[#FFF6F3]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Refer Friends & Earn Rewards
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Share GO7 with your friends and family. Both of you get amazing rewards when they make their first order!
          </p>
        </div>

        {/* Main Referral Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8 max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            {/* Left: Referral Code */}
            <div className="text-center md:text-left">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Your Referral Code
              </h3>
              <div className="bg-[#FFF6F3] border-2 border-[#E53935] rounded-lg p-6 mb-6">
                <div className="text-3xl font-bold text-[#E53935] mb-2">
                  {referralCode}
                </div>
                <button
                  onClick={copyToClipboard}
                  className="bg-[#E53935] hover:bg-[#B71C1C] text-white font-semibold py-2 px-6 rounded-lg transition-colors duration-200"
                >
                  {copied ? "Copied! ✓" : "Copy Code"}
                </button>
              </div>
            </div>

            {/* Right: How it works */}
            <div>
              <h4 className="text-xl font-semibold text-gray-900 mb-4">
                How it works:
              </h4>
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="bg-[#E53935] text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">
                    1
                  </div>
                  <p className="text-gray-600">Share your unique referral code with friends</p>
                </div>
                <div className="flex items-start">
                  <div className="bg-[#E53935] text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">
                    2
                  </div>
                  <p className="text-gray-600">They use your code when making their first order</p>
                </div>
                <div className="flex items-start">
                  <div className="bg-[#E53935] text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">
                    3
                  </div>
                  <p className="text-gray-600">Both of you receive amazing rewards!</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Benefits Grid */}
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {benefits.map((benefit, index) => (
            <div key={index} className="bg-white rounded-xl p-6 text-center shadow-md">
              <div className="text-4xl mb-3">{benefit.icon}</div>
              <h5 className="font-semibold text-gray-900 mb-2">{benefit.title}</h5>
              <p className="text-gray-600 text-sm">{benefit.description}</p>
            </div>
          ))}
        </div>

        {/* Call to Action */}
        <div className="text-center mt-10">
          <button className="bg-[#E53935] hover:bg-[#B71C1C] text-white font-semibold py-3 px-8 rounded-lg transition-colors duration-200 shadow-lg">
            Start Referring Now
          </button>
        </div>
      </div>
    </section>
  );
};

export default ReferralBanner;
