import React from 'react';
import { CartProvider } from '../../go7 figma/contexts/backend/CartContext.jsx';
import { OrderProvider } from '../../go7 figma/contexts/backend/OrderContext.jsx';
import { TrackingProvider } from '../../go7 figma/contexts/backend/TrackingContext.jsx';
import { AuthProvider } from '../../go7 figma/contexts/backend/AuthContext.jsx';

/**
 * Provider stack used by go7 figma screens (Profile, Orders, Track, Chat, TrackDelivery).
 * Wrap figma pages that depend on backend/OrderContext, CartContext, or TrackingContext.
 */
export function FigmaProviders({ children, includeAuth = false }) {
  const inner = (
    <CartProvider>
      <OrderProvider>
        <TrackingProvider>{children}</TrackingProvider>
      </OrderProvider>
    </CartProvider>
  );

  if (includeAuth) {
    return <AuthProvider>{inner}</AuthProvider>;
  }

  return inner;
}
