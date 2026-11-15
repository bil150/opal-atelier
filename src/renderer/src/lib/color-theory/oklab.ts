/**
 * OKLab (Björn Ottosson, 2020): a perceptual space where equal steps look equal.
 * Used for smooth gradients, desaturation at constant lightness and hue angles.
 */
import { clamp01, linearToSrgb, mod, srgbToLinear, type Rgb01 } from './srgb'

export type OkLab = readonly [l: number, a: number, b: number]

export function toOklab([r8, g8, b8]: Rgb01): OkLab {
  const r = srgbToLinear(r8)
  const g = srgbToLinear(g8)
  const b = srgbToLinear(b8)
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ]
}

/** OKLab → sRGB, clamped into the displayable range. */
export function fromOklab([L, A, B]: OkLab): Rgb01 {
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3
  return [
    clamp01(linearToSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s)),
    clamp01(linearToSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s)),
    clamp01(linearToSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s)),
  ]
}

/** Linear interpolation in OKLab: t = 0 → from, t = 1 → to. */
export function mixOklab(from: OkLab, to: OkLab, t: number): OkLab {
  return [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t, from[2] + (to[2] - from[2]) * t]
}

/** Towards grey at the same lightness; s = 1 keeps the colour, s = 0 is fully grey. */
export function desaturate(c: Rgb01, s: number): Rgb01 {
  if (s >= 1) return c
  const [L, A, B] = toOklab(c)
  return fromOklab([L, A * s, B * s])
}

/** Lightness, chroma and hue angle (degrees) in OKLab. */
export interface OkLch {
  readonly l: number
  readonly c: number
  readonly h: number
}

export function toOklch(c: Rgb01): OkLch {
  const [L, A, B] = toOklab(c)
  return { l: L, c: Math.hypot(A, B), h: mod((Math.atan2(B, A) * 180) / Math.PI, 360) }
}

/** Signed shortest turn from hue a to hue b, in degrees (−180…180). */
export function hueDifference(a: number, b: number): number {
  const d = mod(b - a, 360)
  return d > 180 ? d - 360 : d
}
