/**
 * Finds the tubes (1 to 3) and proportions whose mix comes closest to a target colour.
 * Colour difference is CIEDE2000; mixing follows Kubelka-Munk (see kubelka-munk.ts).
 */
import { labFromLinear, linearToRgb, rgbToLab, type Lab, type LinearRgb, type Rgb } from './color'
import { deltaE2000, deltaE76 } from './delta-e'
import { mixReflectance, prepareTube, type TubeOptics } from './kubelka-munk'
import { simpleRatio } from './ratio'

/** ΔE "paid" per extra tube when ranking the alternative recipes. */
export const TUBE_PENALTY = 0.35
/** Recipes within this ΔE of the best one look identical; the simplest is then preferred. */
export const SAME_ENOUGH = 0.3
/** Below 2 % a tube cannot be dosed, so it is dropped. */
export const MIN_SHARE = 0.02
/** Number of distinct recipes returned (the best one and its alternatives). */
export const MAX_VARIANTS = 5

const COARSE_STEPS = 20
/** Budget for the exhaustive three-tube search (combinations × grid points). */
const TRIPLE_SEARCH_BUDGET = 2_200_000
const TRIPLE_GRID_POINTS = 171
const TOP_PAIRS_FOR_TRIPLES = 10

export interface MixableTube {
  readonly id: string
  readonly rgb: Rgb
}

export interface RecipeItem {
  /** Position of the tube in the list given to the solver. */
  readonly index: number
  readonly id: string
  /** Share of the mix, 0–1. */
  readonly weight: number
}

export interface MixRecipe {
  /** Tubes from the largest to the smallest share. */
  readonly items: readonly RecipeItem[]
  readonly mixRgb: Rgb
  /** CIEDE2000 difference between the mix and the target. */
  readonly deltaE: number
  /** Simple whole-number ratio (e.g. [3, 1]), or null if none is close enough. */
  readonly parts: readonly number[] | null
}

export interface MixSolution {
  readonly best: MixRecipe
  /** Up to MAX_VARIANTS recipes, `best` first, then other tube sets from simplest/closest to farthest. */
  readonly alternatives: readonly MixRecipe[]
}

interface Candidate {
  readonly idx: readonly number[]
  readonly w: number[]
  readonly e: number
}

export function solveMix(target: Rgb, tubes: readonly MixableTube[]): MixSolution | null {
  const n = tubes.length
  if (!n) return null
  const optics = tubes.map((t) => prepareTube(t.rgb))
  const targetLab = rgbToLab(target)
  const buffer: LinearRgb = [0, 0, 0]

  const labOf = (idx: readonly number[], w: readonly number[]): Lab => {
    mixReflectance(optics, idx, w, buffer)
    return labFromLinear(buffer[0], buffer[1], buffer[2])
  }
  const fastError = (idx: readonly number[], w: readonly number[]) => deltaE76(labOf(idx, w), targetLab)
  const error = (idx: readonly number[], w: readonly number[]) => deltaE2000(labOf(idx, w), targetLab)

  // Phase 1: coarse sweep (5 % steps) with the fast metric; keep the best point of each combination.
  const pool: Candidate[] = []
  for (let i = 0; i < n; i++) pool.push({ idx: [i], w: [1], e: fastError([i], [1]) })

  const pairs: Candidate[] = []
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      let best: Candidate | null = null
      for (let s = 1; s < COARSE_STEPS; s++) {
        const w = [s / COARSE_STEPS, 1 - s / COARSE_STEPS]
        const e = fastError([i, j], w)
        if (!best || e < best.e) best = { idx: [i, j], w, e }
      }
      if (best) pairs.push(best)
    }
  }
  pool.push(...pairs)

  const bestTriple = (i: number, j: number, k: number): Candidate => {
    let best: Candidate | null = null
    for (let a = 1; a < COARSE_STEPS - 1; a++) {
      for (let c = 1; a + c < COARSE_STEPS; c++) {
        const w = [a / COARSE_STEPS, c / COARSE_STEPS, 1 - (a + c) / COARSE_STEPS]
        const e = fastError([i, j, k], w)
        if (!best || e < best.e) best = { idx: [i, j, k], w, e }
      }
    }
    return best!
  }

  if (n >= 3) {
    const combinations = (n * (n - 1) * (n - 2)) / 6
    if (combinations * TRIPLE_GRID_POINTS <= TRIPLE_SEARCH_BUDGET) {
      for (let i = 0; i < n; i++)
        for (let j = i + 1; j < n; j++) for (let k = j + 1; k < n; k++) pool.push(bestTriple(i, j, k))
    } else {
      // Many tubes: only extend the best pairs with a third tube.
      pairs.sort((a, b) => a.e - b.e)
      for (const pair of pairs.slice(0, TOP_PAIRS_FOR_TRIPLES)) {
        for (let k = 0; k < n; k++) {
          if (pair.idx.includes(k)) continue
          const [a, b, c] = [pair.idx[0]!, pair.idx[1]!, k].sort((x, y) => x - y) as [number, number, number]
          pool.push(bestTriple(a, b, c))
        }
      }
    }
  }

  pool.sort((a, b) => a.e - b.e)

  // Phase 2: fine tuning by moving proportion between tubes, with CIEDE2000.
  const refine = (c: { idx: readonly number[]; w: readonly number[] }): Candidate => {
    const w = c.w.slice()
    let best = error(c.idx, w)
    const m = w.length
    if (m === 1) return { idx: c.idx, w, e: best }
    let step = 0.05
    while (step > 0.002) {
      let improved = false
      for (let a = 0; a < m; a++) {
        for (let b = 0; b < m; b++) {
          if (a === b) continue
          const d = Math.min(step, w[b]!)
          if (d <= 1e-9) continue
          w[a]! += d
          w[b]! -= d
          const e = error(c.idx, w)
          if (e < best - 1e-9) {
            best = e
            improved = true
          } else {
            w[a]! -= d
            w[b]! += d
          }
        }
      }
      if (!improved) step /= 2
    }
    return { idx: c.idx, w, e: best }
  }

  // A share under MIN_SHARE can't be dosed: drop that tube, then re-tune the others (not the other way
  // round — removing it afterwards without re-tuning would skew the mix, a hint of strong pigment weighs a lot).
  const prune = (c: Candidate): Candidate => {
    let current = refine(c)
    while (current.idx.length > 1) {
      let lowest = 0
      for (let q = 1; q < current.w.length; q++) if (current.w[q]! < current.w[lowest]!) lowest = q
      if (current.w[lowest]! >= MIN_SHARE) break
      const idx = current.idx.filter((_, q) => q !== lowest)
      const w = current.w.filter((_, q) => q !== lowest)
      const total = w.reduce((x, y) => x + y, 0)
      current = refine({ idx, w: w.map((v) => v / total) })
    }
    return current
  }

  // Finalists: the best of each size (1, 2 and 3 tubes), so the simplest recipe is never ruled out early.
  const bySize: Candidate[][] = [[], [], [], []]
  for (const c of pool) bySize[c.idx.length]!.push(c) // pool is already sorted by error
  const finalists = [...bySize[1]!.slice(0, 3), ...bySize[2]!.slice(0, 6), ...bySize[3]!.slice(0, 6)].map(
    prune,
  )

  // A finished recipe: tiny shares dropped, proportions renormalised and sorted, real error recomputed.
  const finish = (c: Candidate): MixRecipe => {
    const kept = c.idx.map((index, q) => ({ index, weight: c.w[q]! })).filter((it) => it.weight >= MIN_SHARE)
    const total = kept.reduce((sum, it) => sum + it.weight, 0)
    const sorted = kept
      .map((it) => ({ ...it, weight: it.weight / total }))
      .sort((x, y) => y.weight - x.weight)
    const idx = sorted.map((it) => it.index)
    const w = sorted.map((it) => it.weight)
    mixReflectance(optics, idx, w, buffer)
    const lab = labFromLinear(buffer[0], buffer[1], buffer[2])
    return {
      items: sorted.map((it) => ({ index: it.index, id: tubes[it.index]!.id, weight: it.weight })),
      mixRgb: linearToRgb(buffer),
      deltaE: deltaE2000(lab, targetLab),
      parts: simpleRatio(w),
    }
  }

  // One recipe per set of tubes (the closest one).
  const byTubeSet = new Map<string, MixRecipe>()
  for (const c of finalists) {
    const recipe = finish(c)
    const key = recipe.items
      .map((it) => it.id)
      .sort()
      .join('|')
    const existing = byTubeSet.get(key)
    if (!existing || recipe.deltaE < existing.deltaE) byTubeSet.set(key, recipe)
  }
  const all = [...byTubeSet.values()]

  // The proposed recipe: best ΔE; among those matching it (within SAME_ENOUGH, invisible), the one with
  // the fewest paints; with as many paints, the closest.
  const bestDeltaE = Math.min(...all.map((r) => r.deltaE))
  const best = all
    .filter((r) => r.deltaE <= bestDeltaE + SAME_ENOUGH)
    .sort((a, b) => a.items.length - b.items.length || a.deltaE - b.deltaE)[0]!
  // Other tube sets, from the simplest and closest to the farthest.
  const rank = (r: MixRecipe) => r.deltaE + TUBE_PENALTY * (r.items.length - 1)
  const others = all.filter((r) => r !== best).sort((a, b) => rank(a) - rank(b))

  return { best, alternatives: [best, ...others].slice(0, MAX_VARIANTS) }
}

export interface MixEvaluation {
  readonly mixRgb: Rgb
  readonly deltaE: number
}

/**
 * Evaluates a hand-made recipe with the same model as the solver.
 * Weights are relative (any positive sum). Returns null when nothing is in the mix.
 */
export function evaluateMix(
  target: Rgb,
  tubes: readonly { readonly rgb: Rgb }[],
  weights: readonly number[],
): MixEvaluation | null {
  const total = weights.reduce((x, y) => x + y, 0)
  if (!(total > 0) || !tubes.length) return null
  const optics: TubeOptics[] = tubes.map((t) => prepareTube(t.rgb))
  const buffer: LinearRgb = [0, 0, 0]
  mixReflectance(
    optics,
    tubes.map((_, i) => i),
    weights.map((v) => v / total),
    buffer,
  )
  const lab = labFromLinear(buffer[0], buffer[1], buffer[2])
  return { mixRgb: linearToRgb(buffer), deltaE: deltaE2000(lab, rgbToLab(target)) }
}
