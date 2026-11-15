/**
 * Kubelka-Munk paint mixing, channel by channel (red, green, blue in linear light).
 *
 * Each tube is known only by its reference colour, so K/S = (1 − R)² / 2R is derived from it.
 * The scattering S cannot be measured here; it is estimated from the tube's lightness
 * (S = 1 + 5·Y: a white scatters far more than a dark pigment). This is an approximation —
 * a starting point to check on the palette, not a measurement.
 */
import { SRGB_TO_LINEAR, luminance, type LinearRgb, type Rgb } from './color'

/** Reflectance bounds, so K/S never becomes infinite or zero. */
const R_MIN = 0.004
const R_MAX = 0.996

/** Absorption K per channel and scattering S of one tube. */
export interface TubeOptics {
  readonly k: readonly [number, number, number]
  readonly s: number
}

export function prepareTube(c: Rgb): TubeOptics {
  const r = SRGB_TO_LINEAR[c.r]!
  const g = SRGB_TO_LINEAR[c.g]!
  const b = SRGB_TO_LINEAR[c.b]!
  const s = 1 + 5 * luminance(r, g, b)
  return { k: [absorption(r, s), absorption(g, s), absorption(b, s)], s }
}

/** K = (K/S) × S, with K/S = (1 − R)² / 2R. */
function absorption(linearValue: number, s: number): number {
  const r = Math.min(R_MAX, Math.max(R_MIN, linearValue))
  return (((1 - r) * (1 - r)) / (2 * r)) * s
}

/**
 * Reflectance of tubes `optics[indices[i]]` mixed in proportions `weights[i]` (summing to 1).
 * Writes into `out` and returns it, to avoid allocations in the solver's inner loops.
 */
export function mixReflectance(
  optics: readonly TubeOptics[],
  indices: readonly number[],
  weights: readonly number[],
  out: LinearRgb,
): LinearRgb {
  let sumS = 0
  let k0 = 0
  let k1 = 0
  let k2 = 0
  for (let i = 0; i < indices.length; i++) {
    const p = optics[indices[i]!]!
    const w = weights[i]!
    sumS += w * p.s
    k0 += w * p.k[0]
    k1 += w * p.k[1]
    k2 += w * p.k[2]
  }
  out[0] = reflectance(k0 / sumS)
  out[1] = reflectance(k1 / sumS)
  out[2] = reflectance(k2 / sumS)
  return out
}

function reflectance(ks: number): number {
  return 1 + ks - Math.sqrt(ks * ks + 2 * ks)
}
