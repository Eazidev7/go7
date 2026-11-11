import React, { useState } from 'react';
import { MapPin, ChevronDown } from 'lucide-react';
import { useLocation } from '../contexts/LocationContext';
import AddressModal from './AddressModal';

const AddressSelector = () => {
  const { activeAddress } = useLocation();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const truncateAddress = (address) => {
    if (address.length > 25) {
      return address.substring(0, 25) + '...';
    }
    return address;
  };

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="flex items-center space-x-1 hover:bg-gray-50 rounded-lg px-2 py-1 -mx-2 transition-colors"
      >
        <MapPin size={14} className="text-gray-500 flex-shrink-0" />
        <div className="flex items-center space-x-1">
          <p className="text-sm text-gray-700 font-medium">
            Deliver to {truncateAddress(activeAddress.address)}
          </p>
          <ChevronDown size={12} className="text-gray-400" />
        </div>
      </button>

      <AddressModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </>
  );
};

export default AddressSelector;