import { SRGB_TO_LINEAR, labFromLinear, linearToRgb, type Lab, type LinearRgb, type Rgb } from './color'
import { deltaE76 } from './delta-e'

/** A colour and its share of the image (shares sum to 1). */
export interface WeightedColour {
  readonly rgb: Rgb
  readonly weight: number
}

/** RGBA pixels, 4 bytes each, as in ImageData.data. */
export type PixelData = ArrayLike<number>

/** Pixels below this alpha are treated as transparent and ignored. */
const OPAQUE_ALPHA = 128
const K_MEANS_PASSES = 5

interface Pixel {
  readonly lin: LinearRgb
  readonly lab: Lab
}

function opaquePixels(data: PixelData): Pixel[] {
  const pixels: Pixel[] = []
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3]! < OPAQUE_ALPHA) continue
    const lin: LinearRgb = [
      SRGB_TO_LINEAR[data[i]!]!,
      SRGB_TO_LINEAR[data[i + 1]!]!,
      SRGB_TO_LINEAR[data[i + 2]!]!,
    ]
    pixels.push({ lin, lab: labFromLinear(...lin) })
  }
  return pixels
}

function spread(box: readonly Pixel[]): { axis: 0 | 1 | 2; total: number } {
  const mean = [0, 0, 0]
  const variance = [0, 0, 0]
  for (const p of box) for (let a = 0; a < 3; a++) mean[a]! += p.lab[a]!
  for (let a = 0; a < 3; a++) mean[a]! /= box.length
  for (const p of box) for (let a = 0; a < 3; a++) variance[a]! += Math.pow(p.lab[a]! - mean[a]!, 2)
  const [v0, v1, v2] = variance as [number, number, number]
  return { axis: v0 >= v1 && v0 >= v2 ? 0 : v1 >= v2 ? 1 : 2, total: v0 + v1 + v2 }
}

function centre(pixels: readonly Pixel[]): Pixel {
  const sum = [0, 0, 0]
  for (const p of pixels) {
    sum[0]! += p.lin[0]
    sum[1]! += p.lin[1]
    sum[2]! += p.lin[2]
  }
  const lin: LinearRgb = [sum[0]! / pixels.length, sum[1]! / pixels.length, sum[2]! / pixels.length]
  return { lin, lab: labFromLinear(...lin) }
}

/**
 * Dominant colours of an image, at most `k`: median cut in L*a*b*, then a few k-means passes.
 * Sorted from the largest share to the smallest.
 */
export function dominantColours(data: PixelData, k: number): WeightedColour[] {
  const pixels = opaquePixels(data)
  if (!pixels.length) return []

  const boxes: Pixel[][] = [pixels]
  while (boxes.length < k) {
    let chosen = -1
    let largest = 1e-9
    let axis: 0 | 1 | 2 = 0
    boxes.forEach((box, i) => {
      if (box.length < 2) return
      const s = spread(box)
      if (s.total > largest) {
        largest = s.total
        chosen = i
        axis = s.axis
      }
    })
    if (chosen < 0) break
    const box = boxes[chosen]!.slice().sort((p, q) => p.lab[axis] - q.lab[axis])
    boxes.splice(chosen, 1, box.slice(0, box.length >> 1), box.slice(box.length >> 1))
  }

  let centres = boxes.map(centre)
  let groups: Pixel[][] = []
  for (let pass = 0; pass < K_MEANS_PASSES; pass++) {
    groups = centres.map(() => [])
    for (const p of pixels) {
      let nearest = 0
      let nearestDistance = Infinity
      centres.forEach((c, i) => {
        const d = deltaE76(p.lab, c.lab)
        if (d < nearestDistance) {
          nearestDistance = d
          nearest = i
        }
      })
      groups[nearest]!.push(p)
    }
    centres = centres.map((c, i) => (groups[i]!.length ? centre(groups[i]!) : c))
  }

  return centres
    .map((c, i) => ({ rgb: linearToRgb(c.lin), weight: groups[i]!.length / pixels.length }))
    .filter((c) => c.weight > 0)
    .sort((a, b) => b.weight - a.weight)
}

/**
 * Every colour of an image, each pixel counting. Pixels equal within 4 levels per channel are merged
 * (exact average, weight = their share) to keep later computations fast. Largest share first.
 */
export function allColours(data: PixelData): WeightedColour[] {
  const bins = new Map<number, { r: number; g: number; b: number; n: number }>()
  let count = 0
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3]! < OPAQUE_ALPHA) continue
    count++
    const r = data[i]!
    const g = data[i + 1]!
    const b = data[i + 2]!
    const key = ((r >> 2) << 12) | ((g >> 2) << 6) | (b >> 2)
    let bin = bins.get(key)
    if (!bin) {
      bin = { r: 0, g: 0, b: 0, n: 0 }
      bins.set(key, bin)
    }
    bin.r += r
    bin.g += g
    bin.b += b
    bin.n++
  }
  return [...bins.values()]
    .map((bin) => ({
      rgb: { r: Math.round(bin.r / bin.n), g: Math.round(bin.g / bin.n), b: Math.round(bin.b / bin.n) },
      weight: bin.n / count,
    }))
    .sort((a, b) => b.weight - a.weight)
}
