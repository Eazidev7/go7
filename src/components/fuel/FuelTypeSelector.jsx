import React from 'react';
import { Droplet, Zap, Gauge, Flame, Truck, Clock } from 'lucide-react';
import './FuelAnimations.css';

const FUEL_TYPES = [
  {
    id: 'petrol',
    name: 'Petrol',
    icon: Droplet,
    color: '#E53935',
    description: 'Standard gasoline',
    badge: 'Popular',
    features: ['PMS', 'Clean', 'Fast']
  },
  {
    id: 'diesel', 
    name: 'Diesel',
    icon: Gauge,
    color: '#4CAF50',
    description: 'Diesel fuel',
    badge: 'Efficient',
    features: ['AGO', 'Power', 'Economy']
  },
  {
    id: 'cng',
    name: 'CNG',
    icon: Zap,
    color: '#2196F3',
    description: 'Natural gas cylinder',
    badge: 'Eco',
    features: ['Clean', 'Cheap']
  }
];

export default function FuelTypeSelector({ selectedFuel, onSelect }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-gray-500">Choose Fuel Type</p>
        <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
          <Flame className="w-3 h-3" />
          <span>Quality Fuel</span>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-3">
        {FUEL_TYPES.map((fuel) => {
          const Icon = fuel.icon;
          const isSelected = selectedFuel === fuel.id;
          
          return (
            <button
              key={fuel.id}
              type="button"
              onClick={() => onSelect(fuel.id)}
              className={`
                relative p-4 rounded-xl border-2 transition-all duration-300
                flex flex-col items-center gap-2 group
                ${isSelected 
                  ? 'border-[#E53935] bg-[#E53935]/5 shadow-lg shadow-[#E53935]/20 scale-105' 
                  : 'border-gray-100 hover:border-gray-300 hover:shadow-md hover:scale-102'
                }
              `}
            >
              {isSelected && (
                <div className="absolute top-2 right-2 w-3 h-3 bg-[#E53935] rounded-full flex items-center justify-center animate-bounce">
                  <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
              
              <div className={`
                w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300
                ${isSelected ? 'bg-[#E53935] scale-110' : 'bg-gray-100 group-hover:bg-gray-200'}
              `}>
                <Icon className={`w-6 h-6 ${isSelected ? 'text-white' : 'text-gray-600'} transition-colors duration-300`} />
              </div>
              
              <div className="text-center">
                <p className={`text-sm font-bold ${isSelected ? 'text-[#E53935]' : 'text-gray-700'} transition-colors duration-300`}>
                  {fuel.name}
                </p>
                <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-2 min-h-[2.2em] leading-tight">
                  {fuel.description}
                </p>
                <div className="flex flex-wrap gap-1 mt-1.5 justify-center max-w-full">
                  {fuel.features.map((feature, idx) => (
                    <span key={idx} className="text-[8px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
              
              {fuel.badge && (
                <div className={`absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full text-[8px] font-bold ${
                  isSelected ? 'bg-[#E53935] text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  {fuel.badge}
                </div>
              )}
            </button>
          );
        })}
      </div>
      
      {/* Feature highlights */}
      <div className="mt-4 pt-3 border-t border-gray-100">
        <div className="grid grid-cols-3 gap-2">
          <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
            <Truck className="w-3 h-3 text-[#E53935]" />
            <span>Fast Delivery</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
            <Clock className="w-3 h-3 text-[#E53935]" />
            <span>Real-time Tracking</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
            <Flame className="w-3 h-3 text-[#E53935]" />
            <span>Premium Quality</span>
          </div>
        </div>
      </div>
    </div>
  );
}