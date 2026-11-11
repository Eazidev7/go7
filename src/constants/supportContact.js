/**
 * GO7 customer support — WhatsApp-first contact.
 * Set VITE_SUPPORT_WHATSAPP_NUMBER in .env (digits only, e.g. 2348012345678).
 */

const RAW_NUMBER =
  import.meta.env.VITE_SUPPORT_WHATSAPP_NUMBER ||
  import.meta.env.VITE_SUPPORT_PHONE ||
  '447860015662';

/** Declared before buildWhatsAppUrl() is called — default-param TDZ otherwise. */
export const SUPPORT_WHATSAPP_MESSAGE =
  'Hi GO7 Support, I need help with my order.';

export const SUPPORT_WHATSAPP_DIGITS = String(RAW_NUMBER).replace(/\D/g, '');

function formatNigerianPhone(digits) {
  const d = String(digits || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('234') && d.length >= 13) {
    const local = '0' + d.slice(3);
    return `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}`;
  }
  if (d.startsWith('0') && d.length === 11) {
    return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}`;
  }
  return `+${d}`;
}

export function buildWhatsAppUrl(digits, message = SUPPORT_WHATSAPP_MESSAGE) {
  const phone = String(digits || '').replace(/\D/g, '');
  if (!phone) return 'https://wa.me/';
  const text = encodeURIComponent(message);
  return `https://wa.me/${phone}?text=${text}`;
}

export const SUPPORT_WHATSAPP_DISPLAY = formatNigerianPhone(SUPPORT_WHATSAPP_DIGITS);

export const SUPPORT_WHATSAPP_URL = buildWhatsAppUrl(SUPPORT_WHATSAPP_DIGITS);

export function openWhatsAppSupport(message) {
  const url = message ? buildWhatsAppUrl(SUPPORT_WHATSAPP_DIGITS, message) : SUPPORT_WHATSAPP_URL;
  window.open(url, '_blank', 'noopener,noreferrer');
}
