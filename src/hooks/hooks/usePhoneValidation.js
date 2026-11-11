/**
 * Custom phone validation handler for React Hook Form
 * Prevents browser's default validation messages and ensures consistent UX
 */

import { useEffect } from 'react';

export const usePhoneValidation = (ref, errors, fieldName = 'phoneNumber') => {
  useEffect(() => {
    const input = ref?.current;
    if (!input) return;

    const handleInvalid = (e) => {
      e.preventDefault();
      
      // Set custom validation message
      if (input.validity.patternMismatch) {
        input.setCustomValidity('Enter a valid 11-digit Nigerian phone number (starting with 0)');
      } else if (input.validity.tooShort || input.validity.tooLong) {
        input.setCustomValidity('Phone number must be exactly 11 digits');
      } else if (input.validity.valueMissing) {
        input.setCustomValidity('Phone number is required');
      } else {
        input.setCustomValidity('');
      }
    };

    const handleInput = () => {
      // Clear custom validity on input
      input.setCustomValidity('');
    };

    input.addEventListener('invalid', handleInvalid);
    input.addEventListener('input', handleInput);

    return () => {
      input.removeEventListener('invalid', handleInvalid);
      input.removeEventListener('input', handleInput);
    };
  }, [ref]);
};

export default usePhoneValidation;
