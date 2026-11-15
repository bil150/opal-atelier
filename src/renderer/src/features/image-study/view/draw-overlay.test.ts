import { describe, expect, it } from 'vitest'
import { cellKey } from '../grid/cell-refs'
import { LineStyle, sanitizeGrid } from '../grid/grid-settings'
import { drawGrid, drawSight, type DrawingContext } from './draw-overlay'

/** Records what is drawn. */
function fakeContext() {
  const calls: string[] = []
  const state = { lineWidth: 0, strokeStyle: '', fillStyle: '', font: '', dash: [] as number[] }
  const ctx = {
    save: () => calls.push('save'),
    restore: () => calls.push('restore'),
    beginPath: () => calls.push('beginPath'),
    moveTo: (x: number, y: number) => calls.push(`moveTo ${x} ${y}`),
    lineTo: (x: number, y: number) => calls.push(`lineTo ${x} ${y}`),
    arc: () => calls.push('arc'),
    stroke: () => calls.push('stroke'),
    strokeRect: (x: number, y: number, w: number, h: number) => calls.push(`strokeRect ${x} ${y} ${w} ${h}`),
    fillText: (text: string) => calls.push(`fillText ${text}`),
    setLineDash: (d: number[]) => {
      state.dash = d
    },
    lineCap: 'butt',
    textBaseline: 'alphabetic',
    set lineWidth(v: number) {
      state.lineWidth = v
    },
    get lineWidth() {
      return state.lineWidth
    },
    set strokeStyle(v: string) {
      state.strokeStyle = v
    },
    get strokeStyle() {
      return state.strokeStyle
    },
    set fillStyle(v: string) {
      state.fillStyle = v
    },
    get fillStyle() {
      return state.fillStyle
    },
    set font(v: string) {
      state.font = v
    },
    get font() {
      return state.font
    },
  }
  return { ctx: ctx as unknown as DrawingContext, calls, state }
}

describe('drawGrid', () => {
  it('draws the inner lines only, at a constant screen width', () => {
    const { ctx, calls, state } = fakeContext()
    drawGrid(ctx, 400, 300, 2, {
      grid: sanitizeGrid({ cols: 4, width: 2 }),
      selection: new Set(),
      showSelection: true,
    })
    expect(calls.filter((c) => c.startsWith('moveTo'))).toEqual([
      'moveTo 100 0',
      'moveTo 200 0',
      'moveTo 300 0',
      'moveTo 0 100',
      'moveTo 0 200',
    ])
    expect(state.lineWidth).toBe(4)
    expect(state.dash).toEqual([])
  })

  it('keeps thin lines opaque: at least one whole pixel, set on pixel centres', () => {
    const { ctx, calls, state } = fakeContext()
    drawGrid(ctx, 400, 300, 1, {
      grid: sanitizeGrid({ cols: 4, width: 0.01 }),
      selection: new Set(),
      showSelection: false,
    })
    expect(state.lineWidth).toBe(1)
    expect(calls.find((c) => c.startsWith('moveTo'))).toBe('moveTo 100.5 0')
    const odd = fakeContext()
    drawGrid(odd.ctx, 400, 300, 1, {
      grid: sanitizeGrid({ cols: 4, width: 2.6 }),
      selection: new Set(),
      showSelection: false,
    })
    expect(odd.state.lineWidth).toBe(3)
  })

  it('draws at screen resolution: the finest line is one screen pixel, not one image pixel', () => {
    // A 400 px wide image shown 1600 px wide: 4 output pixels per image pixel.
    const { ctx, calls, state } = fakeContext()
    drawGrid(
      ctx,
      400,
      300,
      0.25,
      { grid: sanitizeGrid({ cols: 4, width: 0.01 }), selection: new Set(), showSelection: false },
      0.25,
    )
    expect(state.lineWidth).toBe(0.25)
    expect(calls.find((c) => c.startsWith('moveTo'))).toBe('moveTo 100.125 0')
  })

  it('uses dashes or dots', () => {
    const dashed = fakeContext()
    drawGrid(dashed.ctx, 400, 300, 1, {
      grid: sanitizeGrid({ dash: LineStyle.Dashed }),
      selection: new Set(),
      showSelection: true,
    })
    expect(dashed.state.dash).toEqual([6, 4])
    const dotted = fakeContext()
    drawGrid(dotted.ctx, 400, 300, 1, {
      grid: sanitizeGrid({ dash: LineStyle.Dotted }),
      selection: new Set(),
      showSelection: true,
    })
    expect(dotted.state.dash).toEqual([0.01, 4])
  })

  it('names cells only when they are big enough on screen', () => {
    const big = fakeContext()
    drawGrid(big.ctx, 400, 300, 1, {
      grid: sanitizeGrid({ cols: 4, letters: true }),
      selection: new Set(),
      showSelection: true,
    })
    expect(big.calls.filter((c) => c.startsWith('fillText'))).toEqual(
      ['A1', 'B1', 'C1', 'D1', 'A2', 'B2', 'C2', 'D2', 'A3', 'B3', 'C3', 'D3'].map((n) => `fillText ${n}`),
    )
    const small = fakeContext()
    drawGrid(small.ctx, 400, 300, 5, {
      grid: sanitizeGrid({ cols: 4, letters: true }),
      selection: new Set(),
      showSelection: true,
    })
    expect(small.calls.some((c) => c.startsWith('fillText'))).toBe(false)
  })

  it('frames the selected cells, except when exporting', () => {
    const shown = fakeContext()
    const selection = new Set([cellKey(1, 0)])
    drawGrid(shown.ctx, 400, 300, 1, { grid: sanitizeGrid({ cols: 4 }), selection, showSelection: true })
    expect(shown.calls.filter((c) => c.startsWith('strokeRect'))).toEqual(['strokeRect 101.5 1.5 97 97'])
    const exported = fakeContext()
    drawGrid(exported.ctx, 400, 300, 1, { grid: sanitizeGrid({ cols: 4 }), selection, showSelection: false })
    expect(exported.calls.some((c) => c.startsWith('strokeRect'))).toBe(false)
  })
})

describe('drawSight', () => {
  it('draws a two-tone crosshair centred on the pixel', () => {
    const { ctx, calls } = fakeContext()
    drawSight(ctx, 10, 20, 1)
    expect(calls.filter((c) => c === 'arc')).toHaveLength(2)
    expect(calls).toContain('moveTo -9.5 20.5')
  })
})
