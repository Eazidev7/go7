/** Nigerian Naira — ASCII-safe for all devices */
export function formatNaira(amount = 0) {
  return `\u20A6${Number(amount || 0).toLocaleString('en-NG')}`;
}
