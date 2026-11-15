import { describe, expect, it } from 'vitest'
import original from '@tests/fixtures/image-study.json'
import { averageColor, hexToRgb, rgbToHex, toCmy, toCmyk, toGreyscale } from './pixels'

describe('colour codes (as the original page)', () => {
  it.each(original.cmyk)('$c', ({ c, cmy, cmyk }) => {
    toCmy(c).forEach((v, i) => expect(v).toBeCloseTo(cmy[i]!, 9))
    toCmyk(c).forEach((v, i) => expect(v).toBeCloseTo(cmyk[i]!, 9))
  })

  it('formats and reads hex codes', () => {
    expect(rgbToHex({ r: 10, g: 171, b: 255 })).toBe('#0AABFF')
    expect(hexToRgb('#0aabff')).toEqual({ r: 10, g: 171, b: 255 })
  })
})

describe('toGreyscale', () => {
  it('keeps the perceived lightness and leaves alpha alone', () => {
    const px = new Uint8ClampedArray([255, 0, 0, 255, 255, 255, 255, 128, 0, 0, 0, 0])
    toGreyscale(px)
    expect([...px]).toEqual([127, 127, 127, 255, 255, 255, 255, 128, 0, 0, 0, 0])
  })
})

describe('averageColor', () => {
  it('averages the square around a point, clipped to the image', () => {
    // 2 × 2 image: red, green / blue, white
    const px = new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 255, 255])
    expect(averageColor(px, 2, 2, 0, 0, 2)).toEqual({ r: 128, g: 128, b: 128 })
    expect(averageColor(px, 2, 2, 1, 1, 0)).toEqual({ r: 255, g: 255, b: 255 })
  })
})
