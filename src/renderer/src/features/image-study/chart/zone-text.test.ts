import { describe, expect, it } from 'vitest'
import { readTubeText } from '@renderer/lib/swatch-chart'
import { zoneFrom, zoneLines, type PositionedText } from './zone-text'

const item = (text: string, x: number, y: number, width = 40, height = 10): PositionedText => ({
  text,
  x,
  y,
  width,
  height,
})

describe('zoneLines', () => {
  const page = [
    item('Ultramarine', 10, 20, 60),
    item('Blue', 75, 21, 25),
    item('PB29', 10, 35),
    item('ASTM I', 60, 34),
    item('Transparent', 10, 50, 70),
    item('Next tube', 10, 90, 60),
    item('   ', 10, 40),
  ]

  it('keeps the text inside the zone, line by line, left to right', () => {
    expect(zoneLines(page, { x0: 0, y0: 10, x1: 120, y1: 60 })).toEqual([
      'Ultramarine Blue',
      'PB29 ASTM I',
      'Transparent',
    ])
  })

  it('feeds the tube text reader', () => {
    expect(readTubeText(zoneLines(page, { x0: 0, y0: 10, x1: 120, y1: 60 }))).toMatchObject({
      name: 'Ultramarine Blue',
      pigment: 'PB29',
    })
  })

  it('ignores text whose centre is outside', () => {
    expect(zoneLines(page, { x0: 0, y0: 80, x1: 50, y1: 100 })).toEqual(['Next tube'])
    expect(zoneLines(page, { x0: 200, y0: 0, x1: 300, y1: 100 })).toEqual([])
  })
})

describe('zoneFrom', () => {
  it('orders the corners and refuses tiny zones', () => {
    expect(zoneFrom({ x: 50, y: 40 }, { x: 10, y: 5 })).toEqual({ x0: 10, x1: 50, y0: 5, y1: 40 })
    expect(zoneFrom({ x: 10, y: 10 }, { x: 14, y: 40 })).toBeNull()
  })
})
