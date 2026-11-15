import { vi } from 'vitest'
import type { Rgb } from '@renderer/lib/paint-mixer'

/**
 * jsdom has no 2D canvas. This stand-in records nothing and reads every pixel as `colour`, which is
 * enough to drive the image views, the picker and the exports in tests.
 */
export function installFakeCanvas(colour: Rgb): () => void {
  const members: Record<string | symbol, unknown> = {
    getImageData: (_x: number, _y: number, w: number, h: number) => {
      const data = new Uint8ClampedArray(Math.max(1, w * h) * 4)
      for (let i = 0; i < data.length; i += 4) {
        data[i] = colour.r
        data[i + 1] = colour.g
        data[i + 2] = colour.b
        data[i + 3] = 255
      }
      return { data, width: w, height: h }
    },
    measureText: () => ({ width: 10 }),
  }
  // Any other method is a no-op; any property can be set.
  const context = new Proxy(members, {
    get: (target, key): unknown => (key in target ? target[key] : () => undefined),
    set: (target, key, value: unknown) => {
      target[key] = value
      return true
    },
  })
  const spy = vi
    .spyOn(HTMLCanvasElement.prototype, 'getContext')
    .mockImplementation(() => context as unknown as CanvasRenderingContext2D)
  return () => spy.mockRestore()
}

/** A loaded picture of the given size, as `loadImageFile` resolves it. */
export function fakeImage(width: number, height: number): HTMLImageElement {
  return { naturalWidth: width, naturalHeight: height, width, height } as HTMLImageElement
}
