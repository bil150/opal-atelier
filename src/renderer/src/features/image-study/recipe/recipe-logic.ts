/**
 * Mixing recipe for a picked colour, from the ticked tubes: the solver's answer, other compositions,
 * hand edits, advice (one more paint) and paints for a whole image. Same engine everywhere.
 */
import { TubeStatus, type PaintTube } from '@renderer/features/paints/paint-tube'
import {
  Exclusion,
  exclusionOf,
  type CalculationOptions,
} from '@renderer/features/paints/tube-classification'
import {
  deltaE76,
  evaluateMix,
  rgbToLab,
  solveMix,
  type MixRecipe,
  type MixSolution,
  type Proposal,
  type Rgb,
} from '@renderer/lib/paint-mixer'
import { hexToRgb } from '@renderer/lib/pixels'

/** Why there is no recipe yet. */
export enum RecipeBlocker {
  NoTarget = 'pick-colour',
  NoTubes = 'add-tubes',
  NoneOwned = 'activate-tubes',
  AllBlackOrEffect = 'no-blacks-no-effects',
  AllBlack = 'no-blacks',
  AllEffect = 'no-effects',
}

export type RecipeState =
  | { readonly blocker: RecipeBlocker }
  | { readonly blocker: null; readonly solution: MixSolution; readonly active: readonly PaintTube[] }

/** Owned tubes that the calculation options don't leave out. */
export function usableTubes(tubes: readonly PaintTube[], options: CalculationOptions): PaintTube[] {
  return tubes.filter((t) => t.status === TubeStatus.Owned && exclusionOf(t, options) === null)
}

const toEngine = (t: PaintTube) => ({ id: t.id, rgb: hexToRgb(t.hex) })

export function computeRecipe(
  target: Rgb | null,
  tubes: readonly PaintTube[],
  options: CalculationOptions,
): RecipeState {
  if (!target) return { blocker: RecipeBlocker.NoTarget }
  const active = usableTubes(tubes, options)
  if (active.length) {
    const solution = solveMix(target, active.map(toEngine))
    if (solution) return { blocker: null, solution, active }
  }
  const owned = tubes.filter((t) => t.status === TubeStatus.Owned)
  if (!owned.length) return { blocker: tubes.length ? RecipeBlocker.NoneOwned : RecipeBlocker.NoTubes }
  const reasons = new Set(owned.map((t) => exclusionOf(t, options)))
  if (reasons.has(Exclusion.Black) && reasons.has(Exclusion.Effect))
    return { blocker: RecipeBlocker.AllBlackOrEffect }
  return { blocker: reasons.has(Exclusion.Black) ? RecipeBlocker.AllBlack : RecipeBlocker.AllEffect }
}

/** One line of a hand-edited composition. */
export interface CompositionRow {
  readonly id: string
  readonly parts: number
}

export const MAX_ROWS = 6
export const MAX_ROW_PARTS = 99

/** Rows of a recipe: its simple ratio, or tenths when there is none. */
export function rowsOf(recipe: MixRecipe): CompositionRow[] {
  const parts = recipe.parts ?? recipe.items.map((it) => Math.max(1, Math.round(it.weight * 10)))
  return recipe.items.map((it, i) => ({ id: it.id, parts: parts[i] ?? 1 }))
}

function gcd(a: number, b: number): number {
  return b ? gcd(b, a % b) : a
}

/**
 * A hand-edited composition evaluated with the solver's model. Rows whose tube is no longer usable are
 * dropped; null when none is left.
 */
export function evaluateRows(
  target: Rgb,
  rows: readonly CompositionRow[],
  active: readonly PaintTube[],
): MixRecipe | null {
  const usable = rows.flatMap((row) => {
    const tube = active.find((t) => t.id === row.id)
    return tube ? [{ row, tube }] : []
  })
  if (!usable.length) return null
  const evaluation = evaluateMix(
    target,
    usable.map(({ tube }) => ({ rgb: hexToRgb(tube.hex) })),
    usable.map(({ row }) => row.parts),
  )
  if (!evaluation) return null
  const total = usable.reduce((sum, { row }) => sum + row.parts, 0)
  const divisor = usable.reduce((a, { row }) => gcd(a, row.parts), 0)
  return {
    items: usable.map(({ row, tube }) => ({
      index: active.indexOf(tube),
      id: row.id,
      weight: row.parts / total,
    })),
    mixRgb: evaluation.mixRgb,
    deltaE: evaluation.deltaE,
    parts: usable.map(({ row }) => row.parts / divisor),
  }
}

/** Advice is offered from this ΔE on. */
export const ADVICE_FROM = 2.5
const ADVICE_TOP = 5
const ADVICE_OWNED = 5
const ADVICE_NEAR = 60
const ADVICE_EXTREMES = 4
const ADVICE_MIN_GAIN = 0.3

export interface Advice {
  readonly tube: PaintTube
  readonly recipe: MixRecipe
}

/**
 * Advice: among the paints not ticked (and not left out), the one that, added to the ticked ones, gets
 * closest to the target. Runs as a generator yielding progress (0–1), so the UI stays responsive and a
 * stale search can be abandoned; returns the best few, closest first.
 */
export function* searchAdvice(
  target: Rgb,
  base: MixRecipe,
  active: readonly PaintTube[],
  candidates: readonly PaintTube[],
): Generator<number, Advice[]> {
  const targetLab = rgbToLab(target)
  const labs = new Map<string, readonly [number, number, number]>()
  const lab = (t: PaintTube) => {
    let l = labs.get(t.id)
    if (!l) {
      l = rgbToLab(hexToRgb(t.hex))
      labs.set(t.id, l)
    }
    return l
  }
  const distance = (t: PaintTube) => deltaE76(lab(t), targetLab)
  const byLightness = (a: PaintTube, b: PaintTube) => lab(a)[0] - lab(b)[0]
  const unique = (list: readonly PaintTube[]) => [...new Map(list.map((t) => [t.id, t])).values()]

  // Ticked tubes kept: those of the recipe, the closest to the target, the lightest and the darkest.
  const sortedActive = active.slice().sort(byLightness)
  const owned = unique([
    ...base.items.flatMap((it) => active.slice(it.index, it.index + 1)),
    ...active
      .slice()
      .sort((a, b) => distance(a) - distance(b))
      .slice(0, ADVICE_OWNED),
    ...sortedActive.slice(0, 2),
    ...sortedActive.slice(-2),
  ])
  // Candidates: the closest to the target by their own colour, and the lightness extremes.
  const sortedCandidates = candidates.slice().sort(byLightness)
  const pool = unique([
    ...candidates
      .slice()
      .sort((a, b) => distance(a) - distance(b))
      .slice(0, ADVICE_NEAR),
    ...sortedCandidates.slice(0, ADVICE_EXTREMES),
    ...sortedCandidates.slice(-ADVICE_EXTREMES),
  ])

  const found: Advice[] = []
  for (const [i, candidate] of pool.entries()) {
    const solution = solveMix(target, [...owned, candidate].map(toEngine))
    if (
      solution?.best.items.some((it) => it.id === candidate.id) &&
      base.deltaE - solution.best.deltaE >= ADVICE_MIN_GAIN
    ) {
      found.push({ tube: candidate, recipe: solution.best })
    }
    if (i % 6 === 5) yield (i + 1) / pool.length
  }
  return found.sort((a, b) => a.recipe.deltaE - b.recipe.deltaE).slice(0, ADVICE_TOP)
}

/** Paints offered as advice: not ticked and not left out of the calculations. */
export function adviceCandidates(tubes: readonly PaintTube[], options: CalculationOptions): PaintTube[] {
  return tubes.filter((t) => t.status !== TubeStatus.Owned && exclusionOf(t, options) === null)
}

/** "Paints for this image": the proposal shown first — each purchase must gain at least 1 ΔE on average. */
export function preferredProposal(proposals: readonly Proposal[]): number {
  let best = -1
  let bestValue = Infinity
  proposals.forEach((p, k) => {
    if (p.meanDeltaE === null) return
    const value = p.meanDeltaE + p.extraCount
    if (value < bestValue) {
      bestValue = value
      best = k
    }
  })
  return Math.max(0, best)
}

/** Number of image colours considered at each precision level; null = every point. */
export const PRECISION_LEVELS: readonly (number | null)[] = [8, 16, 32, 64, 128, null]
