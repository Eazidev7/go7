// Rider rates and SLA configuration for Go7
export const SLA_TARGETS = {
  pickupMins: 20,      // 20 minutes to pickup
  standardMins: 180,   // 3 hours for standard delivery
  expressMins: 120     // 2 hours for express delivery
};

export const RIDER_PAY_RATES = {
  standard: {
    base: 400,        // Base fee in Naira
    perKm: 100,       // Per kilometer rate
    pod: 100,         // Pay on Delivery fee
    surge: 200        // Surge pricing addition
  },
  express: {
    base: 600,        // Base fee in Naira
    perKm: 150,       // Per kilometer rate
    pod: 100,         // Pay on Delivery fee
    surge: 300        // Surge pricing addition
  }
};

export const CUSTOMER_MARKUP = 0.25; // 25% markup on rider pay
export const MIN_CUSTOMER_FEE = 500;  // Minimum customer fee in Naira

// Export SLA config for compatibility
export const SLA = {
  pickupMins: 20,
  standardMins: 180,
  expressMins: 120
};
