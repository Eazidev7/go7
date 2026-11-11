import React from 'react';
import LiveAreasMap from '../components/maps/LiveAreasMap';

const MapTest = () => {
  const handleAreaSelect = (areaName: string) => {
    alert(`Selected area: ${areaName}`);
    console.log('Area selected:', areaName);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Live Areas Map Test
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            Interactive map of Abeokuta delivery areas with clickable area pills
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">
            Click any area to test selection
          </h2>
          <LiveAreasMap onSelect={handleAreaSelect} />
        </div>

        <div className="mt-8 bg-white rounded-xl shadow p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">
            Features:
          </h3>
          <ul className="space-y-2 text-gray-600">
            <li>✅ Mapbox tiles with OpenStreetMap fallback</li>
            <li>✅ Responsive design (380px desktop, 300px mobile)</li>
            <li>✅ Interactive area pill markers</li>
            <li>✅ Skeleton loader while initializing</li>
            <li>✅ Proper cleanup on unmount</li>
            <li>✅ SSR-safe (renders only in useEffect)</li>
            <li>✅ Accessibility support (ARIA labels, keyboard navigation)</li>
            <li>✅ Error handling with fallback UI</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default MapTest;
