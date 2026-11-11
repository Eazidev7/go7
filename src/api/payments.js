/**
 * Payments API Service
 * Handles Paystack integration and payment operations
 */

// Production URL for Paystack API
const PAYSTACK_API_URL = 'https://api.paystack.co';

// Development mode flag to simulate API calls
const isDev = import.meta.env.DEV;

/**
 * Initialize a payment transaction with Paystack
 * @param {Object} paymentData - Payment initialization data
 * @param {string} paymentData.bookingId - The booking ID for reference
 * @param {number} paymentData.amount - Amount in kobo (Naira * 100)
 * @param {string} paymentData.customerName - Customer's full name
 * @param {string} paymentData.email - Customer's email address
 * @param {string} paymentData.phone - Customer's phone number
 * @returns {Promise<Object>} Paystack initialization response
 */
export async function initializePayment(paymentData) {
  if (isDev) {
    // Simulate Paystack API response in development
    console.log('DEV MODE: Simulating Paystack payment initialization', paymentData);
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Generate a mock reference
    const reference = `GO7-PS-${Date.now().toString().slice(-6)}`;
    
    return {
      status: true,
      message: 'Authorization URL created',
      data: {
        authorization_url: `https://checkout.paystack.com/${reference}`,
        access_code: 'mock_access_code',
        reference
      }
    };
  }
  
  // In production, call the actual Paystack API
  try {
    const response = await fetch('/api/payments/initialize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentData),
    });
    
    if (!response.ok) {
      throw new Error(`Payment initialization failed: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Payment initialization error:', error);
    throw error;
  }
}

/**
 * Verify a payment transaction with Paystack
 * @param {string} reference - The Paystack transaction reference
 * @returns {Promise<Object>} Verification response
 */
export async function verifyPayment(reference) {
  if (isDev) {
    // Simulate Paystack verification response in development
    console.log('DEV MODE: Simulating Paystack payment verification', { reference });
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Randomly simulate success or failure
    const isSuccessful = Math.random() > 0.2; // 80% success rate
    
    if (isSuccessful) {
      return {
        status: true,
        message: 'Verification successful',
        data: {
          status: 'success',
          reference,
          amount: 30000, // 300 NGN in kobo
          gateway_response: 'Successful',
          paid_at: new Date().toISOString(),
          metadata: {
            bookingId: localStorage.getItem('go7:pendingBooking') 
              ? JSON.parse(localStorage.getItem('go7:pendingBooking')).jobId 
              : 'unknown'
          }
        }
      };
    } else {
      return {
        status: false,
        message: 'Payment verification failed',
        data: {
          status: 'failed',
          reference,
          gateway_response: 'Payment failed or abandoned',
        }
      };
    }
  }
  
  // In production, call the actual verification endpoint
  try {
    const response = await fetch(`/api/payments/verify?reference=${reference}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Payment verification failed: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Payment verification error:', error);
    throw error;
  }
}

/**
 * Update booking payment status
 * @param {string} bookingId - The ID of the booking
 * @param {Object} paymentData - Payment data
 * @param {string} paymentData.method - Payment method ('paystack' or 'pod')
 * @param {string} paymentData.status - Payment status ('pending', 'paid', 'failed')
 * @param {string} paymentData.reference - Payment reference (for Paystack)
 * @returns {Promise<Object>} Updated booking data
 */
export async function updateBookingPayment(bookingId, paymentData) {
  if (isDev) {
    console.log('DEV MODE: Simulating booking payment update', { bookingId, paymentData });
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Update stored booking in localStorage for testing
    try {
      const pendingBooking = localStorage.getItem('go7:pendingBooking') 
        ? JSON.parse(localStorage.getItem('go7:pendingBooking')) 
        : null;
      
      if (pendingBooking && pendingBooking.jobId === bookingId) {
        pendingBooking.payment = {
          ...pendingBooking.payment,
          ...paymentData
        };
        localStorage.setItem('go7:pendingBooking', JSON.stringify(pendingBooking));
      }
    } catch (e) {
      console.error('Error updating localStorage booking', e);
    }
    
    return {
      status: true,
      message: 'Booking payment updated',
      data: {
        bookingId,
        payment: paymentData
      }
    };
  }
  
  // In production, call the actual API
  try {
    const response = await fetch(`/api/bookings/${bookingId}/payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentData),
    });
    
    if (!response.ok) {
      throw new Error(`Booking payment update failed: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Booking payment update error:', error);
    throw error;
  }
}
