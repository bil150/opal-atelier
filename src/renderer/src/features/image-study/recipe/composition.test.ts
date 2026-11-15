import { describe, expect, it } from 'vitest'
import { TubeStatus, sanitizePaintTube } from '@renderer/features/paints/paint-tube'
import { solveMix, type MixRecipe, type MixSolution } from '@renderer/lib/paint-mixer'
import { hexToRgb } from '@renderer/lib/pixels'
import {
  addRow,
  addablePaints,
  nextVariant,
  pickVariant,
  removeRow,
  setRowParts,
  setRowTube,
  shownRecipe,
  variantsOf,
} from './composition'
import { MAX_ROWS, MAX_ROW_PARTS, rowsOf } from './recipe-logic'

const tube = (id: string, hex: string) => sanitizePaintTube({ id, name: id, hex, status: TubeStatus.Owned })!
const active = [
  tube('white', '#f4f2ec'),
  tube('blue', '#23308c'),
  tube('yellow', '#f3e33a'),
  tube('red', '#a3122e'),
  tube('umber', '#4a3426'),
]
const target = { r: 110, g: 139, b: 61 }
const solution = solveMix(
  target,
  active.map((t) => ({ id: t.id, rgb: hexToRgb(t.hex) })),
)!

const recipe = (ids: string[]): MixRecipe => ({
  items: ids.map((id, index) => ({ index, id, weight: 1 / ids.length })),
  mixRgb: target,
  deltaE: 1,
  parts: ids.map(() => 1),
})

describe('variants', () => {
  it('starts from the best composition', () => {
    expect(variantsOf(solution)[0]).toEqual(solution.best)
    expect(variantsOf({ best: recipe(['a']), alternatives: [] })).toHaveLength(1)
  })

  it('cycles through the variants and back to the first', () => {
    const several: MixSolution = {
      best: recipe(['white']),
      alternatives: [recipe(['white']), recipe(['blue']), recipe(['red'])],
    }
    expect(pickVariant(several, 0)).toBeNull()
    expect(pickVariant(several, 9)).toBeNull()
    const second = nextVariant(several, null)
    expect(second).toEqual({ rows: [{ id: 'blue', parts: 1 }], variant: 1 })
    const third = nextVariant(several, second)
    expect(third?.variant).toBe(2)
    expect(nextVariant(several, third)).toBeNull()
  })

  it('stays put when there is no other composition', () => {
    const single: MixSolution = { best: recipe(['white']), alternatives: [recipe(['white'])] }
    expect(nextVariant(single, null)).toBeNull()
  })

  it('goes to the second variant after a hand edit', () => {
    const several: MixSolution = {
      best: recipe(['white']),
      alternatives: [recipe(['white']), recipe(['blue'])],
    }
    expect(nextVariant(several, { rows: [], variant: null })?.variant).toBe(1)
  })
})

describe('shownRecipe', () => {
  it('shows the best recipe, a variant as computed, or the edited rows evaluated', () => {
    expect(shownRecipe(solution, null, target, active)).toBe(solution.best)
    const several: MixSolution = {
      best: recipe(['white']),
      alternatives: [recipe(['white']), recipe(['blue'])],
    }
    expect(shownRecipe(several, { rows: [], variant: 1 }, target, active)).toBe(several.alternatives[1])
    const edited = shownRecipe(
      solution,
      {
        rows: [
          { id: 'blue', parts: 1 },
          { id: 'yellow', parts: 3 },
        ],
        variant: null,
      },
      target,
      active,
    )
    expect(edited.items.map((it) => it.id)).toEqual(['blue', 'yellow'])
    expect(edited.parts).toEqual([1, 3])
  })

  it('falls back to the best recipe when no edited row is usable any more', () => {
    expect(shownRecipe(solution, { rows: [{ id: 'gone', parts: 1 }], variant: null }, target, active)).toBe(
      solution.best,
    )
  })
})

describe('hand edits', () => {
  const base = rowsOf(solution.best)

  it('starts from the shown composition and marks it as edited', () => {
    const edited = setRowParts(solution, null, 0, 7)
    expect(edited.variant).toBeNull()
    expect(edited.rows[0]).toEqual({ id: base[0]!.id, parts: 7 })
    expect(edited.rows.slice(1)).toEqual(base.slice(1))
  })

  it('keeps parts between 1 and the maximum, ignoring non-numbers', () => {
    expect(setRowParts(solution, null, 0, 0).rows[0]?.parts).toBe(1)
    expect(setRowParts(solution, null, 0, 500).rows[0]?.parts).toBe(MAX_ROW_PARTS)
    expect(setRowParts(solution, null, 0, 2.6).rows[0]?.parts).toBe(3)
    expect(setRowParts(solution, null, 0, NaN).rows[0]?.parts).toBe(base[0]?.parts)
  })

  it('changes a row’s paint unless another row already has it', () => {
    const two = {
      rows: [
        { id: 'blue', parts: 1 },
        { id: 'yellow', parts: 2 },
      ],
      variant: null,
    }
    expect(setRowTube(solution, two, 0, 'red').rows[0]).toEqual({ id: 'red', parts: 1 })
    expect(setRowTube(solution, two, 0, 'yellow').rows).toEqual(two.rows)
  })

  it('removes a row but never the last one', () => {
    const two = {
      rows: [
        { id: 'blue', parts: 1 },
        { id: 'yellow', parts: 2 },
      ],
      variant: null,
    }
    const one = removeRow(solution, two, 0)
    expect(one.rows).toEqual([{ id: 'yellow', parts: 2 }])
    expect(removeRow(solution, one, 0).rows).toEqual(one.rows)
  })

  it('adds a paint once, up to the maximum number of rows', () => {
    const one = { rows: [{ id: 'blue', parts: 2 }], variant: null }
    expect(addRow(solution, one, 'red').rows).toEqual([
      { id: 'blue', parts: 2 },
      { id: 'red', parts: 1 },
    ])
    expect(addRow(solution, one, 'blue').rows).toEqual(one.rows)
    const full = {
      rows: Array.from({ length: MAX_ROWS }, (_, i) => ({ id: `t${i}`, parts: 1 })),
      variant: null,
    }
    expect(addRow(solution, full, 'red').rows).toHaveLength(MAX_ROWS)
  })

  it('offers only the paints not in the rows yet', () => {
    expect(addablePaints(active, [{ id: 'blue', parts: 1 }]).map((t) => t.id)).toEqual([
      'white',
      'yellow',
      'red',
      'umber',
    ])
    const full = Array.from({ length: MAX_ROWS }, (_, i) => ({ id: `t${i}`, parts: 1 }))
    expect(addablePaints(active, full)).toEqual([])
  })
})
