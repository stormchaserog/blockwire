/** Compact human count formatting for member pills and similar chrome:
 *  1234 → "1.2K", 12400 → "12.4K", 1000000 → "1.0M"; anything under a
 *  thousand renders verbatim ("847"). One decimal place always for K/M —
 *  the design mock shows "12.4K members", not "12K" or "12.40K". */
export const formatCompactCount = (count: number): string => {
  if (!Number.isFinite(count)) return '0';
  const n = Math.max(0, Math.trunc(count));
  if (n < 1000) return String(n);
  // 999_950+ would round to "1000.0K"; promote those to the M tier instead.
  if (n < 999_950) return `${(n / 1000).toFixed(1)}K`;
  return `${(n / 1_000_000).toFixed(1)}M`;
};
