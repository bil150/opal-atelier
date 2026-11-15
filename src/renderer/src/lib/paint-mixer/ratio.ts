const TOLERANCE = 0.04
const MAX_TOTAL_PARTS = 24

function gcd(a: number, b: number): number {
  return b ? gcd(b, a % b) : a
}

/**
 * Simple whole-number ratio (e.g. 3 : 1) matching the proportions within ±4 %, or null if none
 * exists with at most 24 parts in total. Proportions must sum to 1.
 */
export function simpleRatio(weights: readonly number[]): number[] | null {
  if (weights.length === 1) return [1]
  for (let total = weights.length; total <= MAX_TOTAL_PARTS; total++) {
    const parts = weights.map((w) => Math.max(1, Math.round(w * total)))
    const sum = parts.reduce((a, b) => a + b, 0)
    const fits = weights.every((w, i) => Math.abs(parts[i]! / sum - w) <= TOLERANCE)
    if (!fits) continue
    const divisor = parts.reduce(gcd)
    return parts.map((p) => p / divisor)
  }
  return null
}
