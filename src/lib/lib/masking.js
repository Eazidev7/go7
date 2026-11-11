/**
 * Communication Masking Library
 * Handles masked phone calls and messaging between customers and riders
 * for privacy protection and communication routing
 */

/**
 * Generate a masked phone number
 * In production, this would integrate with services like Twilio Proxy or MessageBird
 */
export const generateMaskedNumber = (orderId) => {
  // Stub implementation - in production this would generate a real masked number
  const maskedNumbers = [
    '+234-800-MASK-001',
    '+234-800-MASK-002',
    '+234-800-MASK-003',
    '+234-800-MASK-004',
    '+234-800-MASK-005'
  ];
  
  // Use order ID to consistently assign the same masked number
  const index = parseInt(orderId.slice(-1)) % maskedNumbers.length;
  return maskedNumbers[index];
};

/**
 * Initiate a masked call between customer and rider
 * @param {string} orderId - The order ID
 * @param {string} callerType - 'customer' or 'rider'
 * @param {string} callerNumber - The caller's actual phone number
 * @param {string} recipientNumber - The recipient's actual phone number
 */
export const initiateMaskedCall = async (orderId, callerType, callerNumber, recipientNumber) => {
  try {
    const response = await fetch(`/api/mask-call?orderId=${orderId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        orderId,
        callerType,
        callerNumber,
        recipientNumber,
        timestamp: new Date().toISOString()
      })
    });

    if (!response.ok) {
      throw new Error('Failed to initiate masked call');
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Masked call error:', error);
    throw error;
  }
};

/**
 * Get masked communication details for an order
 * @param {string} orderId - The order ID
 */
export const getMaskedCommunicationDetails = (orderId) => {
  return {
    maskedNumber: generateMaskedNumber(orderId),
    chatAvailable: true,
    callAvailable: true,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours from now
  };
};

/**
 * Handle masked call button click
 * @param {string} orderId - The order ID
 */
export const handleMaskedCall = (orderId) => {
  // Redirect to masked call endpoint
  window.location.href = `/api/mask-call?orderId=${orderId}`;
};

/**
 * Handle chat button click
 * @param {string} orderId - The order ID
 * @param {function} navigate - React Router navigate function
 */
export const handleChat = (orderId, navigate) => {
  navigate(`/chat/${orderId}`);
};

/**
 * Format phone number for display
 * @param {string} phoneNumber - The phone number to format
 */
export const formatPhoneNumber = (phoneNumber) => {
  if (!phoneNumber) return '';
  
  // Simple formatting for Nigerian numbers
  if (phoneNumber.startsWith('+234')) {
    return phoneNumber.replace(/(\+234)(\d{3})(\d{4})(\d{4})/, '$1 $2 $3 $4');
  }
  
  return phoneNumber;
};

/**
 * Validate if communication is allowed for the order
 * @param {object} order - The order object
 */
export const isCommunicationAllowed = (order) => {
  const allowedStatuses = ['confirmed', 'assigned', 'picked_up', 'in_transit'];
  return allowedStatuses.includes(order.status);
};
