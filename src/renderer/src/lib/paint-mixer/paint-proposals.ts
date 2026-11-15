/**
 * Which paints to use (and which to buy) to reproduce a whole image.
 *
 * Owned paints that help come first; then, one at a time, the paint that improves the whole set the most.
 * Each addition is a proposal ("no purchase", "+1", "+2"…). It stops when an addition barely helps:
 * no point buying a paint that others already let you mix.
 */
import { labFromLinear, rgbToLab, type Lab, type LinearRgb, type Rgb } from './color'
import { deltaE2000, deltaE76 } from './delta-e'
import type { WeightedColour } from './image-colours'
import { mixReflectance, prepareTube } from './kubelka-munk'

export interface PoolPaint {
  readonly id: string
  readonly rgb: Rgb
  readonly owned: boolean
}

export interface ProposalOptions {
  /** Maximum number of paints to buy (default 6). */
  readonly maxExtra?: number
  /** Smallest mean ΔE gain worth an extra paint (default 0.3; halved for owned paints). */
  readonly minGain?: number
}

export interface Proposal {
  /** Paints added on top of the owned ones (0 = no purchase). */
  readonly extraCount: number
  /** Mean CIEDE2000 over the image (best mix of 1 or 2 paints per colour), weighted by share; null without paints. */
  readonly meanDeltaE: number | null
  /** Share of the image reproduced within ΔE 3. */
  readonly coverage: number
  /** Share of the image where each paint (by id) is used. */
  readonly usage: Readonly<Record<string, number>>
}

export interface PaintProposals {
  /** Useful owned paints, in the order they were picked. */
  readonly owned: readonly string[]
  /** Paints worth buying, most useful first. */
  readonly toBuy: readonly string[]
  /** One entry per purchase level: 0, 1, … toBuy.length. */
  readonly proposals: readonly Proposal[]
}

const DEFAULT_MAX_EXTRA = 6
const DEFAULT_MIN_GAIN = 0.3
/** Upper bound on the number of paints in a set. */
const MAX_SET = 14
/** Pair mixes are sampled at 1/20 … 19/20. */
const STEPS = 19
/** Above this many paints, only a shortlist of candidates is evaluated. */
const SHORTLIST_SIZE = 60
/** Below this share a paint does not count as "used" in a mix. */
const MIN_USAGE_WEIGHT = 0.05
/** ΔE below which a colour counts as reproduced. */
const COVERAGE_DELTA_E = 3
const WHITE_SUPPORT: Lab = [100, 0, 0]

export function proposePaints(
  targets: readonly WeightedColour[],
  pool: readonly PoolPaint[],
  options: ProposalOptions = {},
): PaintProposals {
  const maxExtra = options.maxExtra ?? DEFAULT_MAX_EXTRA
  const minGain = options.minGain ?? DEFAULT_MIN_GAIN
  const T = targets.length
  const weightSum = targets.reduce((s, t) => s + t.weight, 0) || 1
  const W = targets.map((t) => t.weight / weightSum)
  const targetLabs = targets.map((t) => rgbToLab(t.rgb))
  const optics = pool.map((p) => prepareTube(p.rgb))
  const buffer: LinearRgb = [0, 0, 0]

  const singleLab = (p: number): Lab => {
    mixReflectance(optics, [p], [1], buffer)
    return labFromLinear(...buffer)
  }
  const pairLabs = (p: number, m: number): Lab[] => {
    const out: Lab[] = []
    for (let s = 1; s <= STEPS; s++) {
      mixReflectance(optics, [p, m], [s / (STEPS + 1), 1 - s / (STEPS + 1)], buffer)
      out.push(labFromLinear(...buffer))
    }
    return out
  }
  /** Smallest fast ΔE per target colour over a list of mixes. */
  const bestOver = (labs: readonly Lab[]): Float64Array => {
    const out = new Float64Array(T).fill(Infinity)
    for (const lab of labs) {
      for (let q = 0; q < T; q++) {
        const e = deltaE76(lab, targetLabs[q]!)
        if (e < out[q]!) out[q] = e
      }
    }
    return out
  }

  const single = pool.map((_, p) => bestOver([singleLab(p)]))
  // Without paint, every colour is compared to the white support.
  const current = Float64Array.from(targetLabs, (lab) => deltaE76(WHITE_SUPPORT, lab))
  const chosen: number[] = []
  const inSet = new Set<number>()
  const withSet = new Map<number, Float64Array>()

  // Candidates: close to an important colour of the image, plus the lightest, darkest and most vivid.
  const shortlist = (ids: readonly number[]): number[] => {
    if (ids.length <= SHORTLIST_SIZE) return ids.slice()
    const score = new Map<number, number>()
    const labs = new Map<number, Lab>()
    for (const p of ids) {
      score.set(p, 0)
      labs.set(p, singleLab(p))
    }
    const top = T > 100 ? 3 : 8
    for (let q = 0; q < T; q++) {
      for (const p of ids
        .slice()
        .sort((a, b) => single[a]![q]! - single[b]![q]!)
        .slice(0, top)) {
        score.set(p, score.get(p)! + W[q]!)
      }
    }
    const keep = ids
      .filter((p) => score.get(p)! > 0)
      .sort((a, b) => score.get(b)! - score.get(a)!)
      .slice(0, SHORTLIST_SIZE)
    const lab = (p: number) => labs.get(p)!
    const byLightness = ids.slice().sort((a, b) => lab(a)[0] - lab(b)[0])
    const byChroma = ids
      .slice()
      .sort((a, b) => Math.hypot(lab(b)[1], lab(b)[2]) - Math.hypot(lab(a)[1], lab(a)[2]))
    for (const p of [...byLightness.slice(0, 4), ...byLightness.slice(-4), ...byChroma.slice(0, 8)]) {
      if (!keep.includes(p)) keep.push(p)
    }
    return keep
  }

  const bestWith = (c: number): Float64Array => {
    const cached = withSet.get(c)
    if (cached) return cached
    const best = Float64Array.from(single[c]!)
    for (const m of chosen) {
      const pair = bestOver(pairLabs(c, m))
      for (let q = 0; q < T; q++) if (pair[q]! < best[q]!) best[q] = pair[q]!
    }
    withSet.set(c, best)
    return best
  }
  const scoreOf = (c: number): number => {
    const best = bestWith(c)
    let s = 0
    for (let q = 0; q < T; q++) s += W[q]! * Math.min(current[q]!, best[q]!)
    return s
  }
  const mean = (): number => {
    let s = 0
    for (let q = 0; q < T; q++) s += W[q]! * current[q]!
    return s
  }
  const take = (c: number): void => {
    const best = bestWith(c)
    for (let q = 0; q < T; q++) if (best[q]! < current[q]!) current[q] = best[q]!
    chosen.push(c)
    inSet.add(c)
    for (const [k, arr] of withSet) {
      if (inSet.has(k)) continue
      const pair = bestOver(pairLabs(k, c))
      for (let q = 0; q < T; q++) if (pair[q]! < arr[q]!) arr[q] = pair[q]!
    }
  }
  const greedy = (ids: readonly number[], limit: number, gainThreshold: number): number[] => {
    const picked: number[] = []
    const candidates = shortlist(ids)
    while (picked.length < limit && chosen.length < MAX_SET) {
      const base = mean()
      let bestCandidate = -1
      let bestScore = Infinity
      for (const c of candidates) {
        if (inSet.has(c)) continue
        const s = scoreOf(c)
        if (s < bestScore) {
          bestScore = s
          bestCandidate = c
        }
      }
      if (bestCandidate < 0 || base - bestScore < gainThreshold) break
      take(bestCandidate)
      picked.push(bestCandidate)
    }
    return picked
  }

  const ownedIds: number[] = []
  const otherIds: number[] = []
  pool.forEach((p, k) => (p.owned ? ownedIds : otherIds).push(k))
  const ownedPicked = greedy(ownedIds, MAX_SET, minGain / 2)
  const toBuy = maxExtra > 0 ? greedy(otherIds, maxExtra, minGain) : []

  // Assessment of a set: best mix of 1 or 2 paints for each colour (CIEDE2000).
  const assess = (set: readonly number[]): Omit<Proposal, 'extraCount'> => {
    const mixes: { lab: Lab; ids: number[]; w: number[] }[] = []
    set.forEach((p, a) => {
      mixes.push({ lab: singleLab(p), ids: [p], w: [1] })
      for (let b = a + 1; b < set.length; b++) {
        const m = set[b]!
        pairLabs(p, m).forEach((lab, s) => {
          mixes.push({ lab, ids: [p, m], w: [(s + 1) / (STEPS + 1), 1 - (s + 1) / (STEPS + 1)] })
        })
      }
    })
    let total = 0
    let coverage = 0
    const usage: Record<string, number> = {}
    for (let q = 0; q < T; q++) {
      let best: (typeof mixes)[number] | null = null
      let bestError = Infinity
      for (const mix of mixes) {
        const e = deltaE76(mix.lab, targetLabs[q]!)
        if (e < bestError) {
          bestError = e
          best = mix
        }
      }
      if (!best) continue
      const de = deltaE2000(best.lab, targetLabs[q]!)
      total += W[q]! * de
      if (de < COVERAGE_DELTA_E) coverage += W[q]!
      best.ids.forEach((p, i) => {
        if (best.w[i]! >= MIN_USAGE_WEIGHT) {
          const id = pool[p]!.id
          usage[id] = (usage[id] ?? 0) + W[q]!
        }
      })
    }
    return set.length ? { meanDeltaE: total, coverage, usage } : { meanDeltaE: null, coverage: 0, usage }
  }

  const proposals: Proposal[] = []
  for (let extraCount = 0; extraCount <= toBuy.length; extraCount++) {
    proposals.push({ extraCount, ...assess([...ownedPicked, ...toBuy.slice(0, extraCount)]) })
  }
  return {
    owned: ownedPicked.map((k) => pool[k]!.id),
    toBuy: toBuy.map((k) => pool[k]!.id),
    proposals,
  }
}
