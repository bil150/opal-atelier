/**
 * Display colours as sRGB channels in 0–1 (what the screen shows), plus the helpers to
 * convert to linear light, CSS and greyscale.
 */

/** sRGB colour, each channel 0–1. */
export type Rgb01 = readonly [r: number, g: number, b: number]

export const clamp01 = (v: number): number => Math.min(1, Math.max(0, v))

/** Positive modulo: mod(-30, 360) = 330. */
export const mod = (v: number, m: number): number => ((v % m) + m) % m

export function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

export function linearToSrgb(c: number): number {
  return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055
}

/** "#rrggbb" → channels 0–1. */
export function hexToRgb01(hex: string): Rgb01 {
  const channel = (i: number) => parseInt(hex.slice(i, i + 2), 16) / 255
  return [channel(1), channel(3), channel(5)]
}

/** CSS colour, e.g. "rgb(12 34 56)". */
export function cssColor(c: Rgb01): string {
  return `rgb(${c.map((v) => Math.round(clamp01(v) * 255)).join(' ')})`
}

/** Same luminance, no hue: how the colour reads in black and white. */
export function toGrey([r, g, b]: Rgb01): Rgb01 {
  const y = linearToSrgb(0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b))
  return [y, y, y]
}

/** Black or white text, whichever reads better on `background`. */
export function readableInk(background: Rgb01, threshold = 0.5): '#000' | '#fff' {
  return toGrey(background)[0] > threshold ? '#000' : '#fff'
}

/** Pure hue at full saturation and value (screen colour wheel). */
export function hsv(h: number, s: number, v: number): Rgb01 {
  const f = (n: number) => {
    const k = mod(n + h / 60, 6)
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1))
  }
  return [f(5), f(3), f(1)]
}
