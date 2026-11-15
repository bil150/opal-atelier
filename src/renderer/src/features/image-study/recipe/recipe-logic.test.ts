import { describe, expect, it } from 'vitest'
import { TubeStatus, sanitizePaintTube, type PaintTube } from '@renderer/features/paints/paint-tube'
import { DEFAULT_CALCULATION_OPTIONS } from '@renderer/features/paints/tube-classification'
import { solveMix } from '@renderer/lib/paint-mixer'
import {
  RecipeBlocker,
  adviceCandidates,
  computeRecipe,
  evaluateRows,
  preferredProposal,
  rowsOf,
  searchAdvice,
  usableTubes,
} from './recipe-logic'

const tube = (id: string, hex: string, status = TubeStatus.Owned, name = id) =>
  sanitizePaintTube({ id, name, hex, status })!

const white = tube('white', '#f4f2ec')
const blue = tube('blue', '#23308c')
const yellow = tube('yellow', '#f3e33a')
const red = tube('red', '#a3122e')
const black = tube('black', '#1c1c1e', TubeStatus.Owned, 'Ivory black')
const gold = sanitizePaintTube({ id: 'gold', name: 'Gold', pigment: 'PM1', hex: '#c9a227', status: 'owned' })!
const target = { r: 110, g: 139, b: 61 }

function runToEnd<T>(gen: Generator<number, T>): { result: T; progress: number[] } {
  const progress: number[] = []
  for (;;) {
    const step = gen.next()
    if (step.done) return { result: step.value, progress }
    progress.push(step.value)
  }
}

describe('computeRecipe', () => {
  const options = DEFAULT_CALCULATION_OPTIONS

  it('needs a target, then tubes, then ticked usable tubes', () => {
    expect(computeRecipe(null, [blue], options)).toEqual({ blocker: RecipeBlocker.NoTarget })
    expect(computeRecipe(target, [], options)).toEqual({ blocker: RecipeBlocker.NoTubes })
    expect(computeRecipe(target, [tube('b', '#23308c', TubeStatus.Catalogue)], options)).toEqual({
      blocker: RecipeBlocker.NoneOwned,
    })
    expect(computeRecipe(target, [black], options)).toEqual({ blocker: RecipeBlocker.AllBlack })
    expect(computeRecipe(target, [gold], options)).toEqual({ blocker: RecipeBlocker.AllEffect })
    expect(computeRecipe(target, [gold, black], options)).toEqual({ blocker: RecipeBlocker.AllBlackOrEffect })
  })

  it('solves with the usable ticked tubes only', () => {
    const state = computeRecipe(target, [white, blue, yellow, red, black], options)
    expect(state.blocker).toBeNull()
    if (state.blocker) return
    expect(state.active.map((t) => t.id)).toEqual(['white', 'blue', 'yellow', 'red'])
    expect(state.solution.best.deltaE).toBeLessThan(10)
  })

  it('uses blacks when the option allows it', () => {
    expect(
      usableTubes([black, white], { excludeBlacks: false, excludeEffects: true }).map((t) => t.id),
    ).toEqual(['black', 'white'])
  })
})

describe('hand-edited compositions', () => {
  const active: PaintTube[] = [white, blue, yellow]

  it('turns a recipe into rows of whole parts', () => {
    const solution = solveMix(
      target,
      active.map((t) => ({ id: t.id, rgb: { r: 0, g: 0, b: 0 } })),
    )!
    const rows = rowsOf({
      ...solution.best,
      parts: [3, 1],
      items: [
        { index: 1, id: 'blue', weight: 0.75 },
        { index: 2, id: 'yellow', weight: 0.25 },
      ],
    })
    expect(rows).toEqual([
      { id: 'blue', parts: 3 },
      { id: 'yellow', parts: 1 },
    ])
    expect(
      rowsOf({ ...solution.best, parts: null, items: [{ index: 0, id: 'white', weight: 0.42 }] }),
    ).toEqual([{ id: 'white', parts: 4 }])
  })

  it('evaluates rows with the solver’s model and simplifies the ratio', () => {
    const recipe = evaluateRows(
      target,
      [
        { id: 'blue', parts: 2 },
        { id: 'yellow', parts: 6 },
      ],
      active,
    )!
    expect(recipe.parts).toEqual([1, 3])
    expect(recipe.items.map((it) => [it.id, it.index, it.weight])).toEqual([
      ['blue', 1, 0.25],
      ['yellow', 2, 0.75],
    ])
    expect(recipe.deltaE).toBeGreaterThan(0)
  })

  it('drops rows whose tube is no longer ticked', () => {
    expect(evaluateRows(target, [{ id: 'gone', parts: 1 }], active)).toBeNull()
    expect(
      evaluateRows(
        target,
        [
          { id: 'gone', parts: 1 },
          { id: 'blue', parts: 1 },
        ],
        active,
      )?.items,
    ).toHaveLength(1)
  })
})

describe('advice', () => {
  it('offers only paints that are not ticked and not left out', () => {
    const wanted = tube('green', '#0f5c4a', TubeStatus.Wanted)
    const catalogue = tube('ochre', '#c08a2e', TubeStatus.Catalogue)
    const blackCatalogue = tube('bk', '#111111', TubeStatus.Catalogue, 'Mars black')
    expect(
      adviceCandidates([white, wanted, catalogue, blackCatalogue], DEFAULT_CALCULATION_OPTIONS).map(
        (t) => t.id,
      ),
    ).toEqual(['green', 'ochre'])
  })

  it('finds the paint that brings the colour closer, closest first', () => {
    const active = [white, red]
    const real = computeRecipe(target, active, DEFAULT_CALCULATION_OPTIONS)
    if (real.blocker) throw new Error('should solve')
    const candidates = [
      tube('green', '#0f5c4a', TubeStatus.Catalogue),
      tube('yellow2', '#f3e33a', TubeStatus.Catalogue),
    ]
    const { result } = runToEnd(searchAdvice(target, real.solution.best, active, candidates))
    expect(result.length).toBeGreaterThan(0)
    expect(result[0]!.recipe.deltaE).toBeLessThan(real.solution.best.deltaE)
    expect(result.every((a, i) => i === 0 || a.recipe.deltaE >= result[i - 1]!.recipe.deltaE)).toBe(true)
  })

  it('reports progress every few candidates', () => {
    const many = Array.from({ length: 13 }, (_, i) =>
      tube(`c${i}`, `#${(30 + i * 15).toString(16).padStart(2, '0')}4060`, TubeStatus.Catalogue),
    )
    const real = computeRecipe(target, [white, red], DEFAULT_CALCULATION_OPTIONS)
    if (real.blocker) throw new Error('should solve')
    const { progress } = runToEnd(searchAdvice(target, real.solution.best, [white, red], many))
    expect(progress.length).toBe(2)
    expect(progress.every((p) => p > 0 && p <= 1)).toBe(true)
  })
})

describe('preferredProposal', () => {
  const p = (extraCount: number, meanDeltaE: number | null) => ({
    extraCount,
    meanDeltaE,
    coverage: 0,
    usage: {},
  })
  it('needs each purchase to gain at least 1 ΔE', () => {
    expect(preferredProposal([p(0, 6), p(1, 4.5), p(2, 4)])).toBe(1)
    expect(preferredProposal([p(0, 3), p(1, 2.5)])).toBe(0)
  })
  it('skips the no-purchase proposal when nothing is owned', () => {
    expect(preferredProposal([p(0, null), p(1, 5), p(2, 3.5)])).toBe(2)
  })
})
