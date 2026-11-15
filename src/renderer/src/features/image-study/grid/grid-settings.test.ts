/** Characterisation tests against the original page's grid (tests/fixtures/image-study.json). */
import { describe, expect, it } from 'vitest'
import original from '@tests/fixtures/image-study.json'
import {
  DEFAULT_LINE_COLOUR,
  FineAdjustment,
  LineStyle,
  cellAt,
  cellRect,
  fineTune,
  gridGeometry,
  isGridAdjusted,
  sanitizeGrid,
  stepColumns,
  withColumns,
} from './grid-settings'

const P = 9
/** The original stored the line style as `dash`. */
const fromLegacy = (g: Record<string, unknown>) => ({
  cols: g.cols,
  cell: g.cell,
  ox: g.ox,
  oy: g.oy,
  color: g.color,
  width: g.width,
  lineStyle: g.dash,
  letters: g.letters,
})

describe('sanitizeGrid', () => {
  it.each(original.cleanGrid)('sanitises $raw like the original', ({ raw, grid }) => {
    const expected = fromLegacy(grid)
    // One deliberate change: without a valid colour, the line is grey (135, 135, 135), no longer black.
    const colour = (raw as { color?: unknown } | null)?.color
    const given = typeof colour === 'string' && /^#?([0-9a-f]{3}){1,2}$/i.test(colour.trim())
    expect(sanitizeGrid(raw)).toEqual(given ? expected : { ...expected, color: DEFAULT_LINE_COLOUR })
  })

  it('allows lines from 0.01 to 8, to a hundredth', () => {
    expect(sanitizeGrid({ v: 2, width: 0.01 }).width).toBe(0.01)
    expect(sanitizeGrid({ v: 2, width: 0.001 }).width).toBe(0.01)
    expect(sanitizeGrid({ v: 2, width: 0.344 }).width).toBe(0.34)
    expect(sanitizeGrid({ v: 2, width: 20 }).width).toBe(8)
  })

  it('draws a grey line by default: rgb(135, 135, 135)', () => {
    expect(DEFAULT_LINE_COLOUR).toBe('#878787')
    expect(sanitizeGrid(null).color).toBe('#878787')
  })

  it('reads this app’s own line style field', () => {
    expect(sanitizeGrid({ lineStyle: LineStyle.Dashed, dash: 'dot' }).lineStyle).toBe(LineStyle.Dashed)
    expect(sanitizeGrid({ dash: 'dot' }).lineStyle).toBe(LineStyle.Dotted)
  })
})

describe('gridGeometry', () => {
  it.each(original.geometry)('$grid.cols columns on $w × $h', ({ grid, w, h, geom, rects, adjusted }) => {
    const settings = sanitizeGrid(grid)
    const g = gridGeometry(settings, w, h)
    expect(g.cell).toBeCloseTo(geom.cell, P)
    expect(g.fx).toBeCloseTo(geom.fx, P)
    expect(g.fy).toBeCloseTo(geom.fy, P)
    expect([g.cols, g.rows]).toEqual([geom.cols, geom.rows])
    for (const [c, r, rect] of rects as [number, number, unknown][])
      expect(cellRect(g, c, r, w, h)).toEqual(rect)
    expect(isGridAdjusted(settings)).toBe(adjusted)
  })

  it('finds the cell under a point, nothing outside', () => {
    const g = gridGeometry(sanitizeGrid({ cols: 4 }), 400, 300)
    expect(cellAt(g, 0, 0)).toEqual([0, 0])
    expect(cellAt(g, 399, 299)).toEqual([3, 2])
    expect(cellAt(g, 150, 120)).toEqual([1, 1])
    expect(cellAt(g, 400, 0)).toBeNull()
  })
})

describe('columns', () => {
  it.each(original.setColumns)('sets $n columns and snaps the grid to the corner', ({ n, grid }) => {
    const next = withColumns(sanitizeGrid({ cols: 4, ox: 0.1, oy: 0.2 }), n)
    expect(next.cols).toBe(grid.cols)
    expect(next.cell).toBeCloseTo(grid.cell, P)
    expect([next.ox, next.oy]).toEqual([grid.ox, grid.oy])
  })

  it('steps to the neighbouring whole number first', () => {
    const decimal = withColumns(sanitizeGrid(null), 4.5)
    expect(1 / stepColumns(decimal, 1).cell).toBeCloseTo(5, P)
    expect(1 / stepColumns(decimal, -1).cell).toBeCloseTo(4, P)
    expect(1 / stepColumns(sanitizeGrid(null), 1).cell).toBeCloseTo(5, P)
  })
})

describe('fineTune', () => {
  const base = sanitizeGrid({ cols: 4 })

  it('grows the cell by half pixels of the original image', () => {
    expect(fineTune(base, FineAdjustment.Size, 2, 1000).cell).toBeCloseTo(0.25 + 1 / 1000, P)
  })

  it('shifts by whole pixels, wrapping within one cell', () => {
    const shifted = fineTune(base, FineAdjustment.X, -1, 1000)
    expect(shifted.ox).toBeCloseTo(0.25 - 1 / 1000, P)
    expect(isGridAdjusted(shifted)).toBe(true)
    expect(fineTune(base, FineAdjustment.Y, 3, 1000).oy).toBeCloseTo(3 / 1000, P)
  })

  it('never makes a cell smaller than 4 pixels', () => {
    const tiny = withColumns(base, 100)
    expect(fineTune(tiny, FineAdjustment.Size, -1000, 200).cell).toBeCloseTo(4 / 200, P)
  })
})
