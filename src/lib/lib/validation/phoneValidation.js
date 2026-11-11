/**
 * Nigerian Phone Number Validation Utilities
 * Consistent validation patterns and messages for all phone inputs
 */

/**
 * Nigerian Phone Number Validation Pattern
 * - Must be exactly 11 digits
 * - Must start with 0
 * - Examples: 08012345678, 09012345678, 07012345678
 */
export const NIGERIAN_PHONE_PATTERN = /^0\d{10}$/;

/**
 * HTML5 pattern attribute for Nigerian phone numbers
 */
export const NIGERIAN_PHONE_HTML_PATTERN = '^0\\d{10}$';

/**
 * Standard validation message
 */
export const NIGERIAN_PHONE_ERROR_MESSAGE = 'Enter a valid 11-digit Nigerian phone number (starting with 0)';

/**
 * Placeholder text for phone inputs
 */
export const NIGERIAN_PHONE_PLACEHOLDER = 'e.g., 08166205600';

/**
 * Title attribute for phone inputs (tooltip)
 */
export const NIGERIAN_PHONE_TITLE = 'Enter a valid 11-digit Nigerian phone number (starting with 0)';

/**
 * Zod validation schema for Nigerian phone numbers
 */
export const createNigerianPhoneSchema = (fieldName = 'Phone number') => ({
  min: 1,
  message: `${fieldName} is required`
}, {
  regex: NIGERIAN_PHONE_PATTERN,
  message: NIGERIAN_PHONE_ERROR_MESSAGE
});

/**
 * Complete HTML attributes for Nigerian phone inputs
 */
export const getNigerianPhoneInputProps = () => ({
  type: 'tel',
  pattern: NIGERIAN_PHONE_HTML_PATTERN,
  title: NIGERIAN_PHONE_TITLE,
  placeholder: NIGERIAN_PHONE_PLACEHOLDER,
  inputMode: 'tel',
  autoComplete: 'tel'
});

/**
 * Validate Nigerian phone number
 * @param {string} phone - Phone number to validate
 * @returns {boolean} - True if valid
 */
export const isValidNigerianPhone = (phone) => {
  return NIGERIAN_PHONE_PATTERN.test(phone);
};

/**
 * Format Nigerian phone number for display
 * @param {string} phone - Phone number to format
 * @returns {string} - Formatted phone number
 */
export const formatNigerianPhone = (phone) => {
  if (!phone || phone.length !== 11) return phone;
  
  // Format as 0801 234 5678
  return `${phone.slice(0, 4)} ${phone.slice(4, 7)} ${phone.slice(7)}`;
};

/**
 * Clean phone number input (remove non-digits, ensure starts with 0)
 * @param {string} input - Raw input value
 * @returns {string} - Cleaned phone number
 */
export const cleanNigerianPhoneInput = (input) => {
  if (!input) return '';
  
  // Remove all non-digits
  let cleaned = input.replace(/\D/g, '');
  
  // If starts with 234, convert to 0
  if (cleaned.startsWith('234') && cleaned.length === 13) {
    cleaned = '0' + cleaned.slice(3);
  }
  
  // Ensure starts with 0
  if (cleaned.length > 0 && !cleaned.startsWith('0')) {
    cleaned = '0' + cleaned;
  }
  
  // Limit to 11 digits
  return cleaned.slice(0, 11);
};
