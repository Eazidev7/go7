// Nigerian phone number validation utilities
// For GO7 delivery app

/**
 * Nigerian phone number pattern
 * Supports formats: +234XXXXXXXXXX, 234XXXXXXXXXX, 0XXXXXXXXXX
 */
export const NG_PHONE_PATTERN = /^(\+?234|0)?[789][01]\d{8}$/;

/**
 * Title text for phone validation
 */
export const NG_PHONE_TITLE = "Please enter a valid Nigerian phone number (e.g., +2348012345678, 08012345678)";

/**
 * Check if a phone number is a valid Nigerian number
 * @param {string} phone - The phone number to validate
 * @returns {boolean} - True if valid Nigerian phone number
 */
export function isValidNgPhone(phone) {
  if (!phone || typeof phone !== 'string') {
    return false;
  }
  
  // Remove all spaces and dashes
  const cleanPhone = phone.replace(/[\s-]/g, '');
  
  return NG_PHONE_PATTERN.test(cleanPhone);
}

/**
 * Sanitize phone input by removing non-digit characters except + at start
 * @param {string} input - The raw phone input
 * @returns {string} - Sanitized phone number
 */
export function sanitizePhoneInput(input) {
  if (!input || typeof input !== 'string') {
    return '';
  }
  
  // Remove all characters except digits and + at the beginning
  let sanitized = input.replace(/[^\d+]/g, '');
  
  // Only allow + at the beginning
  if (sanitized.includes('+')) {
    const parts = sanitized.split('+');
    sanitized = '+' + parts.join('');
  }
  
  return sanitized;
}

/**
 * Format Nigerian phone number to standard format
 * @param {string} phone - The phone number to format
 * @returns {string} - Formatted phone number (+234XXXXXXXXXX)
 */
export function formatNgPhone(phone) {
  if (!isValidNgPhone(phone)) {
    return phone; // Return as-is if invalid
  }
  
  const cleanPhone = phone.replace(/[\s-]/g, '');
  
  // Convert to +234 format
  if (cleanPhone.startsWith('0')) {
    return '+234' + cleanPhone.slice(1);
  } else if (cleanPhone.startsWith('234')) {
    return '+' + cleanPhone;
  } else if (cleanPhone.startsWith('+234')) {
    return cleanPhone;
  }
  
  // Assume it's missing country code
  if (cleanPhone.length === 10) {
    return '+234' + cleanPhone;
  }
  
  return phone;
}

/**
 * Get display format for Nigerian phone number
 * @param {string} phone - The phone number to display
 * @returns {string} - Display formatted phone number
 */
export function getPhoneDisplayFormat(phone) {
  const formatted = formatNgPhone(phone);
  
  if (formatted.startsWith('+234')) {
    const number = formatted.slice(4);
    return `+234 ${number.slice(0, 3)} ${number.slice(3, 6)} ${number.slice(6)}`;
  }
  
  return formatted;
}

// Export default for convenience
export default {
  NG_PHONE_PATTERN,
  NG_PHONE_TITLE,
  isValidNgPhone,
  sanitizePhoneInput,
  formatNgPhone,
  getPhoneDisplayFormat
};