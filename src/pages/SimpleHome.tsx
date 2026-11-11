
import { Helmet } from 'react-helmet-async';


const SimpleHome = () => {
  return (
    <>
      <Helmet>
        <title>GO7 Delivery - Fast, Reliable Delivery Services in Abeokuta</title>
      </Helmet>

      <div className="min-h-screen bg-gray-50">
        {/* Simple Hero Section */}
        <section className="bg-gradient-to-b from-blue-50 to-white py-20">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              GO7 Delivery
            </h1>
            <h2 className="text-2xl md:text-3xl text-blue-600 mb-6">
              From Burgers to Parcels, We Deliver Fast
            </h2>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Fresh meals, groceries, and packages delivered quickly and reliably across Abeokuta
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors">
                🛵 Book a Delivery
              </button>
              <button className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors">
                🏪 Browse Marketplace
              </button>
            </div>
          </div>
        </section>

        {/* Service Areas Section */}
        <section className="py-12 bg-white">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Service Areas in Abeokuta</h2>
            <p className="text-gray-600 text-lg mb-8">
              We deliver to all major areas in Abeokuta
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900">Oke-Ilewo</h3>
                <p className="text-sm text-gray-600">Central Area</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900">Isabo</h3>
                <p className="text-sm text-gray-600">Commercial Hub</p>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900">Adatan</h3>
                <p className="text-sm text-gray-600">Residential</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900">Kuto</h3>
                <p className="text-sm text-gray-600">Market Area</p>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Services */}
        <section className="py-12 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-8">Quick Services</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="text-4xl mb-4">🍔</div>
                <h3 className="font-semibold text-gray-900">Food Delivery</h3>
                <p className="text-sm text-gray-600">Order from local restaurants</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="text-4xl mb-4">🛒</div>
                <h3 className="font-semibold text-gray-900">Grocery</h3>
                <p className="text-sm text-gray-600">Fresh groceries delivered</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="text-4xl mb-4">📦</div>
                <h3 className="font-semibold text-gray-900">Package</h3>
                <p className="text-sm text-gray-600">Send packages anywhere</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="text-4xl mb-4">🔋</div>
                <h3 className="font-semibold text-gray-900">Powerbank</h3>
                <p className="text-sm text-gray-600">Rent powerbanks</p>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-gray-900 text-white py-12">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <h3 className="text-2xl font-bold mb-4">GO7 Delivery</h3>
            <p className="text-gray-400 mb-4">Fast, Reliable Delivery Services in Abeokuta</p>
            <p className="text-gray-500">&copy; 2025 GO7. All rights reserved.</p>
          </div>
        </footer>
      </div>
    </>
  );
};

export default SimpleHome;