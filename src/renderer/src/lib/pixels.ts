/** Pixel-level helpers: colour codes of a picked colour, and greyscale with the same perceived lightness. */
import type { Rgb } from '@renderer/lib/paint-mixer'

/** Simple subtractive conversion: C, M, Y = 1 − R, G, B. Indicative only (no print profile). */
export function toCmy(c: Rgb): [number, number, number] {
  return [1 - c.r / 255, 1 - c.g / 255, 1 - c.b / 255]
}

/** CMYK: K is the common part of C, M and Y. */
export function toCmyk(c: Rgb): [number, number, number, number] {
  const [cy, ma, ye] = toCmy(c)
  const k = Math.min(cy, ma, ye)
  if (k >= 1) return [0, 0, 0, 1]
  return [(cy - k) / (1 - k), (ma - k) / (1 - k), (ye - k) / (1 - k), k]
}

const hex2 = (n: number) => n.toString(16).padStart(2, '0')

/** "#RRGGBB" in upper case. */
export function rgbToHex(c: Rgb): string {
  return `#${hex2(c.r)}${hex2(c.g)}${hex2(c.b)}`.toUpperCase()
}

export function hexToRgb(hex: string): Rgb {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  }
}

export function rgbCss(c: Rgb): string {
  return `rgb(${c.r},${c.g},${c.b})`
}

const LINEAR = Float32Array.from({ length: 256 }, (_, i) => {
  const c = i / 255
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
})
const ENCODE = Uint8ClampedArray.from({ length: 4096 }, (_, i) => {
  const y = i / 4095
  return Math.round(255 * (y <= 0.0031308 ? 12.92 * y : 1.055 * Math.pow(y, 1 / 2.4) - 0.055))
})

/**
 * In place: each pixel becomes the grey of the same relative luminance (linear sRGB, re-encoded),
 * so the grey shown has the perceived lightness of the colour.
 */
export function toGreyscale(pixels: Uint8ClampedArray): void {
  for (let i = 0; i < pixels.length; i += 4) {
    const y =
      0.2126 * LINEAR[pixels[i]!]! + 0.7152 * LINEAR[pixels[i + 1]!]! + 0.0722 * LINEAR[pixels[i + 2]!]!
    const g = ENCODE[Math.round(y * 4095)]!
    pixels[i] = g
    pixels[i + 1] = g
    pixels[i + 2] = g
  }
}

/** Average colour of the (2r+1)² square around (x, y), clipped to the image: photos and scans have grain. */
export function averageColor(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
  radius: number,
): Rgb {
  const x0 = Math.max(0, x - radius)
  const y0 = Math.max(0, y - radius)
  const x1 = Math.min(width, x + radius + 1)
  const y1 = Math.min(height, y + radius + 1)
  let r = 0
  let g = 0
  let b = 0
  let n = 0
  for (let yy = y0; yy < y1; yy++) {
    for (let xx = x0; xx < x1; xx++) {
      const i = (yy * width + xx) * 4
      r += pixels[i]!
      g += pixels[i + 1]!
      b += pixels[i + 2]!
      n++
    }
  }
  return { r: Math.round(r / n), g: Math.round(g / n), b: Math.round(b / n) }
}
