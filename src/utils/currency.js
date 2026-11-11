export function formatCurrency(v) {
  if (v == null) return "₦0";
  const n = Number(v);
  return "₦" + n.toLocaleString();
}