/** Characterisation tests against the original page's cell names (tests/fixtures/image-study.json). */
import { describe, expect, it } from 'vitest'
import original from '@tests/fixtures/image-study.json'
import { cellKey, cellName, columnIndex, columnLabel, parseCellRefs, sortedCells } from './cell-refs'

describe('column labels', () => {
  it.each(original.columns)('column $c is $label', ({ c, label, back }) => {
    expect(columnLabel(c)).toBe(label)
    expect(columnIndex(label)).toBe(back)
  })

  it('names a cell like a chessboard square', () => {
    expect(cellName(2, 0)).toBe('C1')
  })
})

describe('parseCellRefs (4 columns × 3 rows)', () => {
  it.each(original.refs)('"$text"', ({ text, cells, bad }) => {
    const parsed = parseCellRefs(text, 4, 3)
    const expected = cells.map((k) => {
      const [c = 0, r = 0] = k.split(',').map(Number)
      return cellKey(c, r)
    })
    expect([...parsed.cells].sort()).toEqual(expected.sort())
    expect(parsed.rejected).toEqual(bad)
  })
})

describe('sortedCells', () => {
  it('orders by row, then column', () => {
    expect(sortedCells(new Set([cellKey(1, 1), cellKey(3, 0), cellKey(0, 1)]))).toEqual([
      [3, 0],
      [0, 1],
      [1, 1],
    ])
  })
})
