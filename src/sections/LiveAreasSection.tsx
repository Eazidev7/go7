import React from 'react';
import LiveAreasAbeokuta from '../components/maps/LiveAreasAbeokuta-fixed';

interface LiveAreasSectionProps {
  onSelect?: (areaName: string) => void;
}

const LiveAreasSection: React.FC<LiveAreasSectionProps> = ({ onSelect }) => {
  return (
    <section id="live-areas" className="py-12 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-[#1E1E1E] mb-4 text-center">Our Service Areas in Abeokuta</h2>
        <p className="text-gray-600 text-lg text-center mb-8">
          Click a live area to see vendors near you.
        </p>
        <div className="bg-white rounded-2xl shadow-sm border p-6 map-wrap">
          <LiveAreasAbeokuta onSelect={onSelect} />
        </div>
      </div>
    </section>
  );
};

export default LiveAreasSection;