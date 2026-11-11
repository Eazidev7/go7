import React from 'react';
import MobileHomePage from '../components/MobileHomePage';

const MobilePreview = () => {
  return (
    <div className="w-full min-h-screen bg-gray-100 flex items-center justify-center p-4">
      {/* Mobile device frame */}
      <div className="relative w-[375px] h-[812px] bg-white rounded-[3rem] shadow-2xl overflow-hidden border-8 border-gray-900">
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-7 bg-gray-900 rounded-b-3xl z-50"></div>
        
        {/* Screen content */}
        <div className="w-full h-full overflow-y-auto">
          <MobileHomePage />
        </div>
      </div>
    </div>
  );
};

export default MobilePreview;
