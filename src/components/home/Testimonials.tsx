import React from 'react';

interface Testimonial {
  id: number;
  name: string;
  avatar: string;
  location: string;
  rating: number;
  review: string;
  orderType: string;
}

const testimonials: Testimonial[] = [
  {
    id: 1,
    name: "Adebayo Ogundimu",
    avatar: "/api/placeholder/60/60",
    location: "Oke-Ilewo, Abeokuta",
    rating: 5,
    review: "GO7 has been a lifesaver! Their Express delivery got my urgent documents to Ibara in just 15 minutes. The rider was professional and kept me updated throughout.",
    orderType: "Express Delivery"
  },
  {
    id: 2,
    name: "Funmi Adeyemi",
    avatar: "/api/placeholder/60/60",
    location: "Kuto, Abeokuta",
    rating: 5,
    review: "I love how I can track my orders in real-time. Ordered groceries from Itoku Market and they arrived fresh and perfectly packaged. Excellent service!",
    orderType: "Market Shopping"
  },
  {
    id: 3,
    name: "Tunde Bakare",
    avatar: "/api/placeholder/60/60",
    location: "Lafenwa, Abeokuta",
    rating: 4,
    review: "The fare calculator is spot-on accurate. No hidden charges, transparent pricing. I've been using GO7 for my business deliveries for 6 months now.",
    orderType: "Business Delivery"
  },
  {
    id: 4,
    name: "Kemi Johnson",
    avatar: "/api/placeholder/60/60",
    location: "Sapon, Abeokuta",
    rating: 5,
    review: "Amazing customer service! When my rider couldn't find my location, the support team called me immediately and resolved it. Food arrived hot and delicious.",
    orderType: "Food Delivery"
  },
  {
    id: 5,
    name: "Yemi Adeolu",
    avatar: "/api/placeholder/60/60",
    location: "Totoro, Abeokuta",
    rating: 5,
    review: "The referral program is fantastic! I've referred 5 friends and earned enough credits for free deliveries. GO7 really values customer loyalty.",
    orderType: "Multiple Services"
  },
  {
    id: 6,
    name: "Bisi Afolabi",
    avatar: "/api/placeholder/60/60",
    location: "Omida, Abeokuta",
    rating: 4,
    review: "I appreciate the live map tracking. I can see exactly where my rider is and plan accordingly. Makes the whole experience stress-free and reliable.",
    orderType: "Standard Delivery"
  }
];

const renderStars = (rating: number) => {
  return Array.from({ length: 5 }, (_, i) => (
    <span
      key={i}
      className={`text-lg ${
        i < rating ? 'text-yellow-400' : 'text-gray-300'
      }`}
    >
      ★
    </span>
  ));
};

const Testimonials: React.FC = () => {
  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            What Our Customers Say
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Join thousands of satisfied customers who trust GO7 for their delivery needs across Abeokuta
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {testimonials.map((testimonial) => (
            <div
              key={testimonial.id}
              className="bg-gray-50 rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow duration-300"
            >
              {/* Header with avatar and info */}
              <div className="flex items-center mb-4">
                <img
                  src={testimonial.avatar}
                  alt={testimonial.name}
                  className="w-12 h-12 rounded-full mr-4 bg-gray-200"
                />
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">{testimonial.name}</h4>
                  <p className="text-sm text-gray-600">{testimonial.location}</p>
                  <div className="flex items-center mt-1">
                    {renderStars(testimonial.rating)}
                  </div>
                </div>
              </div>

              {/* Review text */}
              <p className="text-gray-700 mb-4 leading-relaxed">
                "{testimonial.review}"
              </p>

              {/* Order type badge */}
              <div className="flex justify-between items-center">
                <span className="bg-[#E53935] text-white px-3 py-1 rounded-full text-xs font-medium">
                  {testimonial.orderType}
                </span>
                <span className="text-gray-500 text-xs">Verified Customer</span>
              </div>
            </div>
          ))}
        </div>

        {/* Trust Indicators */}
        <div className="bg-[#FFF6F3] rounded-xl p-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-3xl font-bold text-[#E53935] mb-2">10K+</div>
              <div className="text-gray-600 text-sm">Happy Customers</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-[#E53935] mb-2">50K+</div>
              <div className="text-gray-600 text-sm">Successful Deliveries</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-[#E53935] mb-2">4.8★</div>
              <div className="text-gray-600 text-sm">Average Rating</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-[#E53935] mb-2">24/7</div>
              <div className="text-gray-600 text-sm">Customer Support</div>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center mt-10">
          <button className="bg-[#E53935] hover:bg-[#B71C1C] text-white font-semibold py-3 px-8 rounded-lg transition-colors duration-200 shadow-lg">
            Join Our Happy Customers
          </button>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
