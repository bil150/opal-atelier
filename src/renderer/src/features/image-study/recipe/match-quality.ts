import { rgbToLab } from '@renderer/lib/paint-mixer'

/** How close a mix is to its target, from the CIEDE2000 difference. */
export enum MatchQuality {
  Excellent = 'excellent',
  VeryGood = 'very-good',
  Good = 'good',
  Approximate = 'approximate',
  Far = 'far',
}

/** ≈ 1: barely visible; 2 to 5: visible up close; > 10: a different colour. */
export function matchQuality(deltaE: number): MatchQuality {
  if (deltaE < 1) return MatchQuality.Excellent
  if (deltaE < 2.5) return MatchQuality.VeryGood
  if (deltaE < 5) return MatchQuality.Good
  if (deltaE < 10) return MatchQuality.Approximate
  return MatchQuality.Far
}

/** Good results show in green, far ones in red. */
export function qualityTone(q: MatchQuality): 'good' | 'neutral' | 'bad' {
  return q === MatchQuality.Excellent || q === MatchQuality.VeryGood
    ? 'good'
    : q === MatchQuality.Far
      ? 'bad'
      : 'neutral'
}

/** Width of the quality bar, 4–100 %: full at ΔE 0, near empty from ΔE 20. */
export function qualityBar(deltaE: number): number {
  return Math.max(4, Math.round((1 - Math.min(deltaE, 20) / 20) * 100))
}

const HUE_STEP = 14 // degrees: neighbouring hues are ordered by lightness
const NEUTRAL_CHROMA = 9 // L*C*h chroma below which a colour counts as neutral

/**
 * Colour order for paint lists: neutrals first from light to dark, then hues in rainbow order
 * (red, orange, yellow, green, cyan, blue, violet, magenta), light to dark within a neighbourhood.
 */
export function sortByColour<T extends { readonly hex: string; readonly name: string }>(
  list: readonly T[],
  locale: string,
): T[] {
  const info = list.map((item) => {
    const [L, a, b] = rgbToLab({
      r: parseInt(item.hex.slice(1, 3), 16),
      g: parseInt(item.hex.slice(3, 5), 16),
      b: parseInt(item.hex.slice(5, 7), 16),
    })
    const chroma = Math.hypot(a, b)
    const hue = ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360
    return { item, L, neutral: chroma < NEUTRAL_CHROMA, bucket: Math.floor(hue / HUE_STEP) }
  })
  info.sort((x, y) => {
    if (x.neutral !== y.neutral) return x.neutral ? -1 : 1
    if (!x.neutral && x.bucket !== y.bucket) return x.bucket - y.bucket
    return y.L - x.L || x.item.name.localeCompare(y.item.name, locale)
  })
  return info.map((x) => x.item)
}

/** ΔE with one decimal, in the reader's number format ("2.5", "2,5"). */
export function formatDeltaE(deltaE: number, locale: string): string {
  return new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(deltaE)
}
