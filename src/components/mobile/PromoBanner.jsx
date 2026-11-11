import React, { useState, useEffect } from 'react';

const PromoBanner = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // Trigger slide-in animation after component mounts
    setTimeout(() => setIsAnimating(true), 100);
    
    // Auto-dismiss after 8 seconds
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 8000);

    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="px-4 pb-4">
      <div 
        className={`relative bg-red-600 rounded-2xl p-4 text-white transition-all duration-500 ease-out transform ${
          isAnimating ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'
        }`}
        style={{ backgroundColor: '#E30613' }}
      >
        <button
          onClick={() => setIsVisible(false)}
          className="absolute top-2 right-2 p-1 rounded-full hover:bg-red-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        <div className="pr-6">
          <h3 className="font-bold text-lg mb-1">
            Get ₦200 Off Your First Order on Go7
          </h3>
          <p className="text-red-100 text-sm mb-3">
            Use code GO7FIRST at checkout
          </p>
          <button className="bg-black text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-gray-800 transition-colors">
            Order Now
          </button>
        </div>
      </div>
    </div>
  );
};

// Add CSS keyframes for slide-in animation
const style = document.createElement('style');
style.textContent = `
  @keyframes slideInFromTop {
    0% {
      transform: translateY(-20px);
      opacity: 0;
    }
    100% {
      transform: translateY(0);
      opacity: 1;
    }
  }
  
  .slide-in {
    animation: slideInFromTop 0.5s ease-out;
  }
`;
document.head.appendChild(style);

export default PromoBanner;
