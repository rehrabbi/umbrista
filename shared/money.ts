/*
 * Prices in crowns, the money of Calvessa (docs/brand.md). Amounts are kept in hundredths of a
 * crown, as whole numbers, so sums never pick up floating-point dust. Pure, with no imports: the
 * server reuses it.
 */

/** The menu's format: the number only, two decimals, no grouping ("4.60"). */
export function formatPrice(minor: number): string {
  if (!Number.isSafeInteger(minor) || minor < 0) {
    throw new RangeError(`A price is a whole, non-negative number of hundredths, not ${minor}`)
  }
  const whole = Math.floor(minor / 100)
  const hundredths = String(minor % 100).padStart(2, '0')
  return `${whole}.${hundredths}`
}

/** Totals and confirmations: the number and the word ("19.10 crowns"). */
export function formatTotal(minor: number): string {
  return `${formatPrice(minor)} crowns`
}
