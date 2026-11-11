export function formatPhoneNumber(phone) {
  let cleaned = String(phone || '').replace(/\D/g, '');
  if (!cleaned) return '';
  if (cleaned.startsWith('234')) {
    cleaned = '0' + cleaned.substring(3);
  }
  if (!cleaned.startsWith('0')) {
    cleaned = '0' + cleaned;
  }
  return cleaned;
}

/** Paystack expects international format, e.g. +2348012345678 */
export function formatPhoneForPaystack(phone) {
  let cleaned = String(phone || '').replace(/\D/g, '');
  if (!cleaned) return '';
  if (cleaned.startsWith('0')) {
    cleaned = '234' + cleaned.substring(1);
  } else if (!cleaned.startsWith('234')) {
    cleaned = '234' + cleaned;
  }
  if (cleaned.length < 13) return '';
  return `+${cleaned}`;
}

export function isValidNigerianPhone(phone) {
  const cleaned = String(phone || '').replace(/\D/g, '');
  if (!cleaned) return false;
  if (cleaned.startsWith('0') && cleaned.length === 11) return true;
  if (cleaned.startsWith('234') && cleaned.length === 13) return true;
  if (cleaned.length === 10) return true;
  return false;
}

export function getPhoneFromUserData(userData) {
  if (!userData) return '';
  const raw =
    userData.phoneNumber ||
    userData.phone ||
    userData.verifiedPhone ||
    userData.mobile ||
    userData.whatsapp ||
    userData.contactPhone ||
    '';
  const formatted = raw ? formatPhoneNumber(raw) : '';
  return isValidNigerianPhone(formatted) ? formatted : '';
}

export function getPhoneSearchFormats(phone) {
  const formattedPhone = formatPhoneNumber(phone);
  return [
    formattedPhone,
    formattedPhone.substring(1),
    '234' + formattedPhone.substring(1),
    '+234' + formattedPhone.substring(1),
  ];
}

export async function findUserByPhone(usersRef, phone, getDocs, query, where) {
  const phoneFormats = getPhoneSearchFormats(phone);
  const phoneFields = ['phoneNumber', 'phone', 'mobile', 'whatsapp', 'contactPhone'];

  for (const format of phoneFormats) {
    for (const field of phoneFields) {
      const snapshot = await getDocs(query(usersRef, where(field, '==', format)));
      if (!snapshot.empty) {
        return { userDoc: snapshot.docs[0], foundFormat: `${field}: ${format}` };
      }
    }
  }

  return { userDoc: null, foundFormat: null };
}
