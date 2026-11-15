/** Mixing paints given as hex colours, with the Kubelka-Munk engine; and simple part ratios. */
import { mixReflectance, prepareTube, type LinearRgb } from '@renderer/lib/paint-mixer'
import { clamp01, linearToSrgb, type Rgb01 } from './srgb'

const NEUTRAL_GREY: Rgb01 = [0.5, 0.5, 0.5]

function hexToRgb8(hex: string) {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  }
}

/** Paints `hexes` mixed in proportions `weights` (any positive sum) → display colour. */
export function mixPaints(hexes: readonly string[], weights: readonly number[]): Rgb01 {
  const sum = weights.reduce((a, b) => a + b, 0)
  if (!sum) return NEUTRAL_GREY
  const optics = hexes.map((h) => prepareTube(hexToRgb8(h)))
  const indices: number[] = []
  const shares: number[] = []
  weights.forEach((w, i) => {
    if (w > 0) {
      indices.push(i)
      shares.push(w / sum)
    }
  })
  const out: LinearRgb = [0, 0, 0]
  mixReflectance(optics, indices, shares, out)
  return [clamp01(linearToSrgb(out[0])), clamp01(linearToSrgb(out[1])), clamp01(linearToSrgb(out[2]))]
}

function gcd(a: number, b: number): number {
  return b ? gcd(b, a % b) : a
}

/** Divides whole parts by their greatest common divisor: [4, 2] → [2, 1]. */
export function reduceParts(parts: readonly number[]): number[] {
  const divisor = parts.reduce((a, b) => gcd(a, b), 0) || 1
  return parts.map((v) => v / divisor)
}

/** Closest simple ratio [base parts, added parts] (at most 12 each) for a share f of added paint. */
export function additionRatio(f: number): number[] {
  let best = [1, 0]
  let bestError = 1
  for (let a = 1; a <= 12; a++) {
    for (let b = 1; b <= 12; b++) {
      const e = Math.abs(b / (a + b) - f)
      if (e < bestError - 1e-9) {
        bestError = e
        best = [a, b]
      }
    }
  }
  return reduceParts(best)
}
