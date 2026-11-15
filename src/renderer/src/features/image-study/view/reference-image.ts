/** The reference image, reduced and kept off screen: base of the views, the picker and the exports. */
import { toGreyscale } from '@renderer/lib/pixels'
import type { Rgb } from '@renderer/lib/paint-mixer'
import { exportBaseName, shrinkToCanvas } from './image-file'

export interface ReferenceImage {
  readonly source: HTMLCanvasElement
  /** File name without extension, safe for exports. */
  readonly name: string
  readonly fileName: string
  readonly originalWidth: number
  readonly originalHeight: number
  /** Changes with every new image (thumbnail and caches follow it). */
  readonly id: number
}

let nextId = 1

export function createReferenceImage(img: HTMLImageElement, fileName: string): ReferenceImage {
  return {
    source: shrinkToCanvas(img),
    name: exportBaseName(fileName),
    fileName,
    originalWidth: img.naturalWidth,
    originalHeight: img.naturalHeight,
    id: nextId++,
  }
}

const greys = new WeakMap<HTMLCanvasElement, HTMLCanvasElement>()

/** Greyscale version with the same perceived lightness, computed once per image. */
export function greyVersion(image: ReferenceImage): HTMLCanvasElement {
  const cached = greys.get(image.source)
  if (cached) return cached
  const { width, height } = image.source
  const out = document.createElement('canvas')
  out.width = width
  out.height = height
  const data = image.source.getContext('2d', { willReadFrequently: true })?.getImageData(0, 0, width, height)
  if (data) {
    toGreyscale(data.data)
    out.getContext('2d')?.putImageData(data, 0, 0)
  }
  greys.set(image.source, out)
  return out
}

/** Exact value of a pixel of the reduced image (never of the displayed canvas, which carries the sight). */
export function pixelAt(image: ReferenceImage, x: number, y: number): Rgb | null {
  const d = image.source.getContext('2d', { willReadFrequently: true })?.getImageData(x, y, 1, 1).data
  return d ? { r: d[0] ?? 0, g: d[1] ?? 0, b: d[2] ?? 0 } : null
}

/** Pixels of the image reduced so its longest side is `side` (for "Paints for this image"). */
export function smallPixels(image: ReferenceImage, side: number): Uint8ClampedArray | null {
  const k = Math.min(1, side / Math.max(image.source.width, image.source.height))
  const w = Math.max(1, Math.round(image.source.width * k))
  const h = Math.max(1, Math.round(image.source.height * k))
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null
  ctx.drawImage(image.source, 0, 0, w, h)
  return ctx.getImageData(0, 0, w, h).data
}
