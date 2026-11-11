// Format a number as currency
export function formatCurrency(value, currency = 'USD') {
  if (value === undefined || value === null) return '';
  
  const amount = typeof value === 'string' ? parseFloat(value) : value;
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

// Format a date
export function formatDate(date) {
  if (!date) return '';
  
  const d = date instanceof Date ? date : new Date(date);
  
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(d);
}

// Format a time
export function formatTime(date) {
  if (!date) return '';
  
  const d = date instanceof Date ? date : new Date(date);
  
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: 'numeric',
    hour12: true
  }).format(d);
}

// Format a date and time
export function formatDateTime(date) {
  if (!date) return '';
  
  const d = date instanceof Date ? date : new Date(date);
  
  return `${formatDate(d)} at ${formatTime(d)}`;
}

// Format a phone number (Nigerian 11-digit format)
export function formatPhone(phone) {
  if (!phone) return '';
  
  const cleaned = ('' + phone).replace(/\D/g, '');
  
  if (cleaned.length < 11) return phone; // Return original if not enough digits
  
  // Nigerian format: 0xxx xxx xxxx
  const match = cleaned.match(/^(0\d{3})(\d{3})(\d{4})$/);
  
  if (match) {
    return `${match[1]} ${match[2]} ${match[3]}`;
  }
  
  return phone; // Return original if format doesn't match
}
