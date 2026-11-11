import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { VendorService } from '../services/VendorService';
import { Search, X } from 'lucide-react';

function SearchResults() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const location = useLocation();
  const navigate = useNavigate();

  // Parse query parameters
  const searchParams = new URLSearchParams(location.search);
  const query = searchParams.get('q') || '';
  const filter = searchParams.get('filter') || 'all';

  // Set initial search input from URL query
  useEffect(() => {
    if (query) {
      setSearchInput(query);
    }
  }, []);

  // Only search when there's a query in the URL
  useEffect(() => {
    const searchVendors = async () => {
      if (!query.trim()) {
        setVendors([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');
        
        const results = await VendorService.searchVendors(
          query, 
          filter === 'all' ? undefined : filter
        );
        
        setVendors(results);
      } catch (err) {
        console.error('Search error:', err);
        setError('Failed to search vendors. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    searchVendors();
  }, [query, filter]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchInput.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchInput.trim())}&filter=${filter}`);
    }
  };

  const handleClearSearch = () => {
    setSearchInput('');
    navigate('/search');
    setVendors([]);
  };

  const handleVendorClick = (vendorId) => {
    navigate(`/shop/${vendorId}`);
  };

  const getBusinessTypeIcon = (type) => {
    const icons = {
      food: '🍔',
      groceries: '🛒',
      pharmacy: '💊',
      errands: '📦'
    };
    return icons[type] || '🏪';
  };

  const getBusinessTypeColor = (type) => {
    const colors = {
      food: 'bg-orange-100 text-orange-600',
      groceries: 'bg-green-100 text-green-600',
      pharmacy: 'bg-blue-100 text-blue-600',
      errands: 'bg-purple-100 text-purple-600'
    };
    return colors[type] || 'bg-gray-100 text-gray-600';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E53935]"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Search Input */}
        <div className="mb-8">
          <form onSubmit={handleSearch} className="relative">
            <div className="relative">
              <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search restaurants, shops or items…"
                autoFocus
                className="w-full pl-12 pr-12 py-4 rounded-xl border border-gray-200 focus:border-[#E53935] focus:ring-2 focus:ring-[#E53935]/20 outline-none transition-all text-base"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              )}
            </div>
          </form>
          
          {query && (
            <p className="text-gray-600 mt-4">
              Showing results for "<span className="font-semibold">{query}</span>"
              {filter !== 'all' && (
                <> in <span className="font-semibold capitalize">{filter}</span></>
              )}
            </p>
          )}
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* No Results */}
        {!loading && !error && vendors.length === 0 && query && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No vendors found
            </h3>
            <p className="text-gray-600 mb-6">
              Try adjusting your search terms or browse by category
            </p>
          </div>
        )}

        {/* Empty State - No search yet */}
        {!loading && !query && vendors.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔎</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Start searching
            </h3>
            <p className="text-gray-600">
              Enter a search term above to find restaurants, shops, or items
            </p>
          </div>
        )}

        {/* Results Grid */}
        {vendors.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {vendors.map((vendor) => (
              <div
                key={vendor.id}
                onClick={() => handleVendorClick(vendor.id)}
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer overflow-hidden"
              >
                {/* Vendor Image */}
                <div className="h-48 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                  {vendor.logo ? (
                    <img
                      src={vendor.logo}
                      alt={vendor.businessName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-4xl">
                      {getBusinessTypeIcon(vendor.businessType)}
                    </div>
                  )}
                </div>

                {/* Vendor Info */}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-lg text-gray-900 truncate">
                      {vendor.businessName}
                    </h3>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getBusinessTypeColor(
                        vendor.businessType
                      )}`}
                    >
                      {vendor.businessType}
                    </span>
                  </div>

                  {vendor.description && (
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                      {vendor.description}
                    </p>
                  )}

                  <div className="flex items-center text-sm text-gray-500">
                    <span>📍</span>
                    <span className="ml-1 truncate">
                      {vendor.pickupAddress || 'Location not specified'}
                    </span>
                  </div>

                  {/* Rating placeholder */}
                  <div className="flex items-center mt-2">
                    <div className="flex text-yellow-400">
                      {'★'.repeat(4)}{'☆'.repeat(1)}
                    </div>
                    <span className="text-sm text-gray-500 ml-2">4.0</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Back to Search */}
        {vendors.length > 0 && (
          <div className="text-center mt-8">
            <button
              onClick={() => navigate('/')}
              className="text-[#E53935] font-semibold hover:underline"
            >
              ← Back to Search
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default SearchResults;