import { z } from 'zod';

// Nigerian phone validation: exactly 11 digits starting with 0
const nigerianPhoneSchema = z
  .string()
  .regex(/^0\d{10}$/, 'Phone number must be 11 digits starting with 0 (e.g., 08166205600)');

export const deliverySchema = z.object({
  pickupAddress: z
    .string()
    .min(5, 'Pickup address must be at least 5 characters')
    .max(200, 'Pickup address too long'),
  
  dropoffAddress: z
    .string()
    .min(5, 'Dropoff address must be at least 5 characters')
    .max(200, 'Dropoff address too long'),
  
  packageSize: z.enum(['small', 'medium', 'large'], {
    message: 'Please select package size'
  }),
  
  deliveryPriority: z.enum(['standard', 'express', 'immediate'], {
    message: 'Please select delivery priority'
  }),
  
  description: z
    .string()
    .max(240, 'Description cannot exceed 240 characters')
    .optional()
    .or(z.literal('')),
  
  senderName: z
    .string()
    .min(2, 'Sender name must be at least 2 characters')
    .max(50, 'Sender name too long'),
  
  senderPhone: nigerianPhoneSchema,
  
  recipientName: z
    .string()
    .min(2, 'Recipient name must be at least 2 characters')
    .max(50, 'Recipient name too long'),
  
  recipientPhone: nigerianPhoneSchema,
  
  paymentMethod: z.enum(['online', 'pod_cash', 'pod_transfer'], {
    message: 'Please select payment method'
  }),
  
  pickupOption: z.enum(['now', 'scheduled'], {
    message: 'Please select pickup option'
  }),
  
  scheduledPickupTime: z
    .string()
    .datetime('Invalid date format')
    .optional(),
  
  agreeToTerms: z
    .boolean()
    .refine(val => val === true, 'You must agree to the terms and conditions')
}).refine((data) => {
  // Enhanced validation for scheduled pickup time
  if (data.pickupOption === 'scheduled') {
    if (!data.scheduledPickupTime) {
      return false;
    }
    
    const now = new Date();
    const pickupDate = new Date(data.scheduledPickupTime);
    
    // Check if date is valid
    if (isNaN(pickupDate.getTime())) {
      return false;
    }
    
    // Check if pickup time is in the past
    if (pickupDate <= now) {
      return false;
    }
    
    // Check minimum time (30 minutes from now)
    const minTime = new Date(now.getTime() + 30 * 60 * 1000);
    if (pickupDate < minTime) {
      return false;
    }
    
    // Check maximum time (48 hours from now)
    const maxTime = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    if (pickupDate > maxTime) {
      return false;
    }
  }
  return true;
}, {
  message: 'Pickup time must be between 30 minutes from now and 48 hours in the future',
  path: ['scheduledPickupTime']
});

export type DeliveryFormData = z.infer<typeof deliverySchema>;

export const validateField = (fieldName: keyof DeliveryFormData, value: any) => {
  try {
    const fieldSchema = deliverySchema.shape[fieldName];
    fieldSchema.parse(value);
    return null;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return error.issues[0]?.message || 'Invalid value';
    }
    return 'Invalid value';
  }
};
