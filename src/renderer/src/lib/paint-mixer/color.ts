/** 8-bit sRGB colour, each channel 0–255. */
export interface Rgb {
  readonly r: number
  readonly g: number
  readonly b: number
}

/** CIE L*a*b* under D65: lightness 0–100, then the a* and b* axes. */
export type Lab = readonly [l: number, a: number, b: number]

/** Linear-light RGB, each channel 0–1 (mutable: used as an output buffer in hot loops). */
export type LinearRgb = [r: number, g: number, b: number]

/** sRGB 8-bit value → linear light, precomputed for the 256 possible values. */
export const SRGB_TO_LINEAR: Readonly<Float64Array> = (() => {
  const table = new Float64Array(256)
  for (let i = 0; i < 256; i++) {
    const c = i / 255
    table[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  }
  return table
})()

/** Linear light (clamped to 0–1) → 8-bit sRGB. */
export function linearToSrgb8(value: number): number {
  const l = value <= 0 ? 0 : value >= 1 ? 1 : value
  const v = l <= 0.0031308 ? 12.92 * l : 1.055 * Math.pow(l, 1 / 2.4) - 0.055
  return Math.round(v * 255)
}

function labCurve(t: number): number {
  return t > 0.008856451679 ? Math.cbrt(t) : 7.787037037 * t + 16 / 116
}

/** Relative luminance Y of a linear RGB colour. */
export function luminance(r: number, g: number, b: number): number {
  return 0.2126729 * r + 0.7151522 * g + 0.072175 * b
}

/** Linear RGB (0–1) → L*a*b* (D65 white). */
export function labFromLinear(r: number, g: number, b: number): Lab {
  const x = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047
  const y = luminance(r, g, b)
  const z = (0.0193339 * r + 0.119192 * g + 0.9503041 * b) / 1.08883
  const fx = labCurve(x)
  const fy = labCurve(y)
  const fz = labCurve(z)
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)]
}

export function rgbToLinear(c: Rgb): LinearRgb {
  return [SRGB_TO_LINEAR[c.r]!, SRGB_TO_LINEAR[c.g]!, SRGB_TO_LINEAR[c.b]!]
}

export function rgbToLab(c: Rgb): Lab {
  return labFromLinear(...rgbToLinear(c))
}

export function linearToRgb([r, g, b]: Readonly<LinearRgb>): Rgb {
  return { r: linearToSrgb8(r), g: linearToSrgb8(g), b: linearToSrgb8(b) }
}
