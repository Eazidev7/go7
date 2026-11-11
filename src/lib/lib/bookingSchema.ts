import { z } from 'zod';

// Nigeria phone validation regex: 11 digits, starts with 070–091
const nigeriaPhoneRegex = /^0(7[0-9]|8[0-1]|9[0-1])[0-9]{8}$/;

// Email regex
const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export const bookingFormSchema = z.object({
  customerName: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters'),
  
  phone: z.string()
    .regex(nigeriaPhoneRegex, 'Enter a valid Nigerian phone number (11 digits, starts with 070–091).'),
  
  customerEmail: z.string()
    .regex(emailRegex, 'Please enter a valid email address')
    .optional()
    .or(z.literal('')),
  
  pickupArea: z.string()
    .min(1, 'Pickup area is required'),
  
  pickupAddress: z.string()
    .min(5, 'Pickup address must be at least 5 characters'),
  
  pickupNotes: z.string().optional(),
  
  dropoffArea: z.string()
    .min(1, 'Dropoff area is required'),
  
  dropoffAddress: z.string()
    .min(5, 'Dropoff address must be at least 5 characters'),
  
  dropoffNotes: z.string().optional(),
  
  packageSize: z.enum(['small', 'medium', 'large'], {
    required_error: 'Package size is required'
  }),
  
  priority: z.enum(['economy', 'standard', 'express'], {
    required_error: 'Priority is required'
  }),
  
  paymentMethod: z.enum(['pod', 'paystack'], {
    required_error: 'Payment method is required'
  })
});

export type BookingFormData = z.infer<typeof bookingFormSchema>;

// Mock riders data
export const mockRiders = [
  { id: 'R-102', name: 'Sola Adebayo', etaMin: 12, areas: ['Kuto', 'Panseke'] },
  { id: 'R-105', name: 'Fatima Alade', etaMin: 8, areas: ['Ibara', 'Adigbe'] },
  { id: 'R-108', name: 'Tunde Kehinde', etaMin: 15, areas: ['Lafenwa', 'Kotopo'] },
  { id: 'R-112', name: 'Grace Ogundimu', etaMin: 10, areas: ['Oke-Ilewo', 'Kuto'] },
  { id: 'R-115', name: 'Ibrahim Hassan', etaMin: 18, areas: ['Isale-Igbein', 'Panseke'] }
];

/**
 * Find the best rider for a pickup area
 */
export function findBestRider(pickupArea: string) {
  // First try to find a rider who covers this area
  const areaRiders = mockRiders.filter(rider => 
    rider.areas.includes(pickupArea)
  );
  
  if (areaRiders.length > 0) {
    // Return the one with shortest ETA
    return areaRiders.reduce((best, current) => 
      current.etaMin < best.etaMin ? current : best
    );
  }
  
  // Fallback to any available rider
  return mockRiders[Math.floor(Math.random() * mockRiders.length)];
}
