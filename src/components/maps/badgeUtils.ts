/**
 * Utilities for Go7 3D Map Badges
 */

interface AreaData {
  name: string;
  coords: [number, number];
  color?: string;
  category?: string;
  clusterId?: number;
}

// Map area category to badge color
export const getBadgeColor = (area: AreaData) => {
  // If a color is already defined, use a direct mapping
  if (area.color) {
    switch (area.color) {
      case 'red': return 'red';
      case 'green': return 'green';
      case 'blue': return 'blue';
      case 'pink': return 'purple'; // Map pink to purple
      case 'orange': return 'orange';
      default: return 'blue';
    }
  }
  
  // If no color but category is available, map categories to colors
  if (area.category) {
    switch (area.category) {
      case 'popular': return 'red';
      case 'residential': return 'green';
      case 'busy': return 'orange';
      case 'market': return 'purple';
      case 'education': return 'blue';
      default: return 'blue';
    }
  }
  
  // Default fallback
  return 'blue';
};

// Map area category to emoji icon
export const getCategoryIcon = (category?: string) => {
  switch (category) {
    case 'market': return '🥬'; // Markets/produce
    case 'popular': return '🍜'; // Food clusters
    case 'education': return '🏫'; // Campus
    case 'residential': return '🏠'; // Residential
    case 'busy': return '🛍️'; // Shopping/busy areas
    default: return '📍'; // Default pin
  }
};

// Badge offset interface for advanced collision detection
export interface BadgeOffset {
  offsetY: number;
  edgeAdjustX: number;
  needsConnector: boolean;
  connectorDirection: 'upward' | 'downward';
}

// Check if badges would collide (simplified collision detection for initial placement)
export const wouldBadgesCollide = (
  pos1: [number, number], 
  pos2: [number, number], 
  map: L.Map, 
  padding = 10
) => {
  const point1 = map.latLngToContainerPoint(pos1 as L.LatLngExpression);
  const point2 = map.latLngToContainerPoint(pos2 as L.LatLngExpression);
  
  // Simple horizontal distance check (assumes badge width ~100px)
  const badgeWidth = 100;
  const horizontalDistance = Math.abs(point1.x - point2.x);
  const verticalDistance = Math.abs(point1.y - point2.y);
  
  // Collision if badges are close horizontally and very close vertically
  return horizontalDistance < badgeWidth + padding && verticalDistance < 30;
};

// Check if DOM elements overlap
export const doElementsOverlap = (rect1: DOMRect, rect2: DOMRect, threshold = 0) => {
  return !(
    rect1.right < rect2.left + threshold ||
    rect1.left > rect2.right - threshold ||
    rect1.bottom < rect2.top + threshold ||
    rect1.top > rect2.bottom - threshold
  );
};

// Calculate the overlap amount between two rectangles
export const getOverlapAmount = (rect1: DOMRect, rect2: DOMRect) => {
  const horizOverlap = Math.min(rect1.right, rect2.right) - Math.max(rect1.left, rect2.left);
  const vertOverlap = Math.min(rect1.bottom, rect2.bottom) - Math.max(rect1.top, rect2.top);
  
  if (horizOverlap <= 0 || vertOverlap <= 0) {
    return 0;
  }
  
  return horizOverlap * vertOverlap;
};

// Determine if a point is out of bounds
export const isOutOfBounds = (rect: DOMRect, containerRect: DOMRect, padding = 6) => {
  return (
    rect.left < containerRect.left + padding ||
    rect.right > containerRect.right - padding ||
    rect.top < containerRect.top + padding ||
    rect.bottom > containerRect.bottom - padding
  );
};