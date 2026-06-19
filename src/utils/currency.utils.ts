/**
 * Currency helpers.
 *
 * `roundCurrency(n)` rounds to 2 decimal places returning a number,
 * intended for arithmetic before further math. Use this instead of
 * `Number(x.toFixed(2))` to avoid a string round-trip and to keep
 * rounding behavior consistent across the app.
 *
 * `formatCurrency(n)` returns a formatted string for display only.
 *
 * Notes:
 *  - JS `Math.round` is half-away-from-zero on positives, half-even-ish
 *    is unavailable without explicit handling. For currency display this
 *    matches user expectation. Sub-cent precision should never be
 *    persisted; persist integer cents at the data layer when possible.
 */
export function roundCurrency(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
}

export function formatCurrency(value: number, currency = "AUD"): string {
  if (!Number.isFinite(value)) value = 0;
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency,
  }).format(value);
}
