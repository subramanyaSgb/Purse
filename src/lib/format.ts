/**
 * INR currency formatter with Indian comma grouping
 * (last 3 digits, then groups of 2: 12,34,567).
 *
 * Defaults to no decimals \xe2\x80\x94 the UI renders most amounts as whole rupees.
 * Pass `{ decimals: 2 }` for line items that need paise.
 */
export function fmtINR(n: number, opts: { sign?: boolean; decimals?: number } = {}): string {
  const { sign = false, decimals = 0 } = opts;
  if (!Number.isFinite(n)) return '₹0';
  const isNeg = n < 0;
  const abs = Math.abs(n);
  const fixed = decimals ? abs.toFixed(decimals) : Math.round(abs).toString();
  const [intPart, decPart] = fixed.split('.');
  const grouped = groupIndian(intPart!);
  const sgn = isNeg ? '−' : sign ? '+' : '';
  return `${sgn}₹${grouped}${decPart ? '.' + decPart : ''}`;
}

function groupIndian(int: string): string {
  if (int.length <= 3) return int;
  const last3 = int.slice(-3);
  const rest = int.slice(0, -3);
  return rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last3;
}

/** "+₹1,234" / "−₹1,234" \xe2\x80\x94 explicit sign for delta cells. */
export function fmtINRSigned(n: number, opts: { decimals?: number } = {}): string {
  return fmtINR(n, { ...opts, sign: true });
}
