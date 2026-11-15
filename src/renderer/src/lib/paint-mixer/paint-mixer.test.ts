/**
 * Characterisation tests: the TypeScript engine must reproduce the original site's engine
 * (outputs captured in tests/fixtures/paint-mixer.json).
 */
import { describe, expect, it } from 'vitest'
import original from '@tests/fixtures/paint-mixer.json'
import type { Lab, LinearRgb } from './color'
import {
  allColours,
  deltaE2000,
  deltaE76,
  dominantColours,
  evaluateMix,
  mixReflectance,
  prepareTube,
  proposePaints,
  rgbToLab,
  simpleRatio,
  solveMix,
  type MixRecipe,
} from '.'

const PRECISION = 9
const tubes = original.tubes

function expectNumbersClose(actual: readonly number[], expected: readonly number[]) {
  expect(actual).toHaveLength(expected.length)
  actual.forEach((value, i) => expect(value).toBeCloseTo(expected[i]!, PRECISION))
}

/** Rebuilds the synthetic test image exactly as the fixture generator did. */
function syntheticImage(width: number, height: number, seed: number): number[] {
  let s = seed
  const rand = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296
  const hex = (h: string) => ({
    r: parseInt(h.slice(1, 3), 16),
    g: parseInt(h.slice(3, 5), 16),
    b: parseInt(h.slice(5, 7), 16),
  })
  const base = ['#7FB3D5', '#C0392B', '#F5CBA7', '#1E8449', '#2C3E50']
  const data: number[] = []
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const c = hex(base[(Math.floor(x / 4) + Math.floor(y / 5)) % base.length]!)
      const i = (y * width + x) * 4
      const noise = () => Math.round((rand() - 0.5) * 24)
      data[i] = Math.min(255, Math.max(0, c.r + noise()))
      data[i + 1] = Math.min(255, Math.max(0, c.g + noise()))
      data[i + 2] = Math.min(255, Math.max(0, c.b + noise()))
      data[i + 3] = rand() < 0.05 ? 0 : 255
    }
  }
  return data
}
const image = syntheticImage(original.image.width, original.image.height, original.image.seed)

interface LegacyRecipe {
  items: { index: number; id: string; weight: number }[]
  mixRgb: { r: number; g: number; b: number }
  de: number
  parts: number[] | null
}

function expectSameRecipe(actual: MixRecipe, expected: LegacyRecipe) {
  expect(actual.items.map((it) => [it.index, it.id])).toEqual(expected.items.map((it) => [it.index, it.id]))
  expectNumbersClose(
    actual.items.map((it) => it.weight),
    expected.items.map((it) => it.weight),
  )
  expect(actual.mixRgb).toEqual(expected.mixRgb)
  expect(actual.deltaE).toBeCloseTo(expected.de, PRECISION)
  expect(actual.parts).toEqual(expected.parts)
}

describe('colour conversion', () => {
  it.each(original.rgbToLab)('rgbToLab($rgb)', ({ rgb, lab }) => {
    expectNumbersClose(rgbToLab(rgb), lab)
  })
})

describe('colour difference', () => {
  it.each(original.deltaE)('ΔE between $a and $b', ({ a, b, de76, de2000 }) => {
    expect(deltaE76(a as unknown as Lab, b as unknown as Lab)).toBeCloseTo(de76, PRECISION)
    expect(deltaE2000(a as unknown as Lab, b as unknown as Lab)).toBeCloseTo(de2000, PRECISION)
  })

  it('matches the published CIEDE2000 reference values (Sharma et al. 2005)', () => {
    expect(deltaE2000([50, 2.6772, -79.7751], [50, 0, -82.7485])).toBeCloseTo(2.0425, 4)
    expect(deltaE2000([50, 2.5, 0], [56, -27, -3])).toBeCloseTo(31.903, 3)
    expect(deltaE2000([2.0776, 0.0795, -1.135], [0.9033, -0.0636, -0.5514])).toBeCloseTo(0.9082, 4)
  })
})

describe('Kubelka-Munk', () => {
  it.each(original.prepareTube)('prepareTube($rgb)', ({ rgb, K, S }) => {
    const optics = prepareTube(rgb)
    expectNumbersClose(optics.k, K)
    expect(optics.s).toBeCloseTo(S, PRECISION)
  })

  const optics = tubes.map((t) => prepareTube(t.rgb))
  it.each(original.mix)('mixes tubes $idx in proportions $w', ({ idx, w, out }) => {
    const buffer: LinearRgb = [0, 0, 0]
    expectNumbersClose(mixReflectance(optics, idx, w, buffer), out)
  })
})

describe('simpleRatio', () => {
  it.each(original.parts)('$weights → $parts', ({ weights, parts }) => {
    expect(simpleRatio(weights)).toEqual(parts)
  })
})

describe('solveMix', () => {
  it.each(original.solve)('target $target with tubes $tubes', ({ target, tubes: selection, result }) => {
    const solution = solveMix(
      target,
      selection.map((i) => tubes[i]!),
    )
    if (!result) {
      expect(solution).toBeNull()
      return
    }
    expect(solution).not.toBeNull()
    expectSameRecipe(solution!.best, result)
    expect(solution!.alternatives).toHaveLength(result.alternatives.length)
    solution!.alternatives.forEach((recipe, i) =>
      expectSameRecipe(recipe, result.alternatives[i] as LegacyRecipe),
    )
    expect(solution!.alternatives[0]).toBe(solution!.best)
  })
})

describe('evaluateMix', () => {
  it.each(original.evaluate)(
    'target $target, tubes $tubes, weights $weights',
    ({ target, tubes: sel, weights, result }) => {
      const evaluation = evaluateMix(
        target,
        sel.map((i) => tubes[i]!),
        weights,
      )
      if (!result) {
        expect(evaluation).toBeNull()
        return
      }
      expect(evaluation?.mixRgb).toEqual(result.mixRgb)
      expect(evaluation?.deltaE).toBeCloseTo(result.de, PRECISION)
    },
  )
})

describe('image colours', () => {
  it.each(original.palette)('dominantColours(k = $k)', ({ k, colours }) => {
    const actual = dominantColours(image, k)
    expect(actual.map((c) => c.rgb)).toEqual(colours.map((c) => c.rgb))
    expectNumbersClose(
      actual.map((c) => c.weight),
      colours.map((c) => c.weight),
    )
  })

  it('allColours merges near-identical pixels', () => {
    const actual = allColours(image)
    expect(actual).toHaveLength(original.allPointsCount)
    expect(actual.slice(0, original.allPoints.length).map((c) => c.rgb)).toEqual(
      original.allPoints.map((c) => c.rgb),
    )
    expectNumbersClose(
      actual.slice(0, original.allPoints.length).map((c) => c.weight),
      original.allPoints.map((c) => c.weight),
    )
  })

  it('ignores transparent pixels and empty images', () => {
    expect(dominantColours([10, 20, 30, 0], 4)).toEqual([])
    expect(allColours([])).toEqual([])
  })
})

describe('proposePaints', () => {
  it.each(original.propose)('owned $owned, maxExtra $maxExtra', ({ owned, maxExtra, targets, result }) => {
    const proposals = proposePaints(
      targets,
      tubes.map((t, i) => ({ ...t, owned: (owned as number[]).includes(i) })),
      { maxExtra },
    )
    expect(proposals.owned).toEqual(result.have)
    expect(proposals.toBuy).toEqual(result.adds)
    expect(proposals.proposals).toHaveLength(result.proposals.length)
    proposals.proposals.forEach((p, i) => {
      const expected = result.proposals[i]!
      expect(p.extraCount).toBe(expected.n)
      if (expected.mean === null) expect(p.meanDeltaE).toBeNull()
      else expect(p.meanDeltaE).toBeCloseTo(expected.mean, PRECISION)
      expect(p.coverage).toBeCloseTo(expected.cover, PRECISION)
      expect(Object.keys(p.usage).sort()).toEqual(Object.keys(expected.use).sort())
      for (const [id, share] of Object.entries(expected.use))
        expect(p.usage[id]).toBeCloseTo(share, PRECISION)
    })
  })
})
