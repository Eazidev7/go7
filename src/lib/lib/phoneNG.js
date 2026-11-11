// Nigeria phone validation helper
export const isValidNGPhone = (v) => /^(?:0)(7[0-9]|8[01]|9[01])[0-9]{8}$/.test(v);

export const formatNGPhone = (phone) => {
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');
  
  // Format as 0803 123 4567
  if (digits.length >= 4) {
    return digits.slice(0, 4) + (digits.length > 4 ? ' ' + digits.slice(4, 7) : '') + 
           (digits.length > 7 ? ' ' + digits.slice(7, 11) : '');
  }
  return digits;
};
