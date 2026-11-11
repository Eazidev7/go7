
import { Link } from 'react-router-dom';

const Hero = () => {
  return (
    <section className="relative bg-gradient-to-b from-blue-50 to-white py-20">
      <div className="container mx-auto px-4">
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            From Burgers to Parcels,<br/>We Deliver Fast
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Fresh meals, groceries, and packages delivered quickly and reliably across Abeokuta
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              to="/book" 
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
            >
              🛵 Book a Delivery
            </Link>
            <Link 
              to="/marketplace" 
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
            >
              🏪 Browse Marketplace
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;