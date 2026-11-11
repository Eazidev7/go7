import React from 'react';
import { trackEvent } from '../utils/analytics';

function Services() {
  return (
    <section id="services" className="py-16 md:py-24 bg-gray-50 w-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">We Deliver It All</h2>
          <p className="mt-4 text-xl text-gray-600 max-w-3xl mx-auto">
            One app for food, markets, and parcels.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Food Delivery Card */}
          <ServiceCard 
            title="Food Delivery"
            description="Get your favorite meals from local restaurants delivered hot and fresh to your doorstep in minutes."
            ctaText="Order Food"
            ctaLink="/order?tab=food"
            icon={<FoodIcon />}
            analyticsCategory="food_delivery"
          />

          {/* Grocery Delivery Card */}
          <ServiceCard 
            title="Grocery Delivery"
            description="Fresh produce, pantry staples, and household essentials delivered from your favorite stores, same day."
            ctaText="Shop Groceries"
            ctaLink="/order?tab=groceries"
            icon={<GroceryIcon />}
            analyticsCategory="grocery_delivery"
          />

          {/* Parcel Delivery Card */}
          <ServiceCard 
            title="Parcel Delivery"
            description="Fast, reliable package delivery across town or across the country with real-time tracking."
            ctaText="Book Delivery"
            ctaLink="/book"
            icon={<ParcelIcon />}
            analyticsCategory="parcel_delivery"
          />
        </div>
      </div>
    </section>
  );
}

// Service Card Component
function ServiceCard({ title, description, ctaText, ctaLink, icon, analyticsCategory }) {
  const handleCTAClick = () => {
    trackEvent('engagement', `${analyticsCategory}_cta_click`, 'Service Card CTA');
  };

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col h-full">
      <div className="p-6 md:p-8 flex flex-col h-full">
        <div className="flex justify-center mb-6" aria-hidden="true">
          <div className="text-[#E53935] w-16 h-16">
            {icon}
          </div>
        </div>
        <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-3 text-center">{title}</h3>
        <p className="text-gray-600 mb-6 text-center flex-grow">{description}</p>
        <div className="mt-auto text-center">
          <a 
            href={ctaLink} 
            className="inline-block px-6 py-3 bg-[#E53935] text-white font-medium rounded-xl hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            onClick={handleCTAClick}
            aria-label={`${ctaText} for ${title}`}
          >
            {ctaText}
          </a>
        </div>
      </div>
    </div>
  );
}

// SVG Icons with accessibility improvements
function FoodIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-full h-full" aria-hidden="true" role="img">
      <title>Food Delivery Icon</title>
      <path d="M11 4a1 1 0 10-2 0v7.59L6.71 9.29a1 1 0 10-1.42 1.42l3.3 3.29a1 1 0 001.42 0l3.29-3.29a1 1 0 00-1.42-1.42L9 11.59V4z" />
      <path d="M5 12a1 1 0 100 2h14a1 1 0 100-2H5z" />
      <path d="M4 18a1 1 0 011-1h14a1 1 0 110 2H5a1 1 0 01-1-1z" />
      <path d="M14 20a1 1 0 011-1h4a1 1 0 110 2h-4a1 1 0 01-1-1z" />
      <path d="M5 20a1 1 0 011-1h4a1 1 0 110 2H6a1 1 0 01-1-1z" />
    </svg>
  );
}

function GroceryIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-full h-full" aria-hidden="true" role="img">
      <title>Grocery Delivery Icon</title>
      <path d="M21.822 7.431A1 1 0 0021 7H7.333L6.179 4.23A1.994 1.994 0 004.333 3H2v2h2.333l4.744 11.385A1 1 0 0010 17h8c.417 0 .79-.259.937-.648l3-8a1 1 0 00-.115-.921zM17.307 15h-6.64l-2.5-6h11.39l-2.25 6z" />
      <path d="M10 20a2 2 0 104 0 2 2 0 00-4 0zm9-2a2 2 0 100 4 2 2 0 000-4z" />
    </svg>
  );
}

function ParcelIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-full h-full" aria-hidden="true" role="img">
      <title>Parcel Delivery Icon</title>
      <path d="M4 7v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2H6c-1.1 0-2 .9-2 2z" />
      <path d="M16.5 12l-5 3-5-3v-4l5 3 5-3v4z" />
    </svg>
  );
}

export default Services;
