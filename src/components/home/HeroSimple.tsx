import React from 'react';

const HeroSimple: React.FC = () => {
  return (
    <section className="bg-red-600 text-white min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-5xl font-bold mb-6">🚀 GO7 Delivery</h1>
        <p className="text-xl mb-8">From Burgers to Parcels, We Deliver Fast</p>
        <div className="space-x-4">
          <button className="bg-white text-red-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100">
            Book a Delivery
          </button>
          <button className="border-2 border-white text-white px-6 py-3 rounded-lg font-semibold hover:bg-white hover:text-red-600">
            Track Order
          </button>
        </div>
      </div>
    </section>
  );
};

export default HeroSimple;