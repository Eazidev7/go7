import React from 'react';
import '../../styles/motion.css';

interface AreaBadgeProps {
  name: string;
  areaType: 'kemta' | 'isabo' | 'ijemo' | 'ijaye' | 'camp' | 'obantoko' | 'funaab' | 'adatan' | 'oke-ilewo' | 'totoro' | 'ijaiye-kukudi' | 'lafenwa' | 'omida' | 'kuto';
  position: [number, number];
  onClick?: () => void;
}

const AreaBadge: React.FC<AreaBadgeProps> = ({ name, areaType, onClick }) => {
  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick?.();
    }
  };

  return (
    <div
      className={`go7-area-pill ${areaType} cursor-pointer chip-motion interactive-motion`}
      onClick={onClick}
      onKeyPress={handleKeyPress}
      role="button"
      tabIndex={0}
      aria-label={`Select area: ${name}`}
      aria-description="Click to filter vendors and markets in this area"
    >
      <div className="go7-area-dot" aria-hidden="true"></div>
      <span>{name}</span>
    </div>
  );
};

export default AreaBadge;
