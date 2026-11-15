import { describe, expect, it } from 'vitest'
import { TubeStatus, sanitizePaintTube } from '@renderer/features/paints/paint-tube'
import { DEFAULT_CALCULATION_OPTIONS } from '@renderer/features/paints/tube-classification'
import type { PaintProposals, Proposal } from '@renderer/lib/paint-mixer'
import {
  collectionNames,
  coverageGain,
  imagePaintPool,
  imageTargets,
  paintLine,
  proposalLists,
  proposeImagePaints,
  sampleSide,
} from './image-paints'

const tube = (id: string, hex: string, status: TubeStatus, group = '', pigment = '') =>
  sanitizePaintTube({ id, name: id, hex, status, group, pigment })!

const white = tube('white', '#f4f2ec', TubeStatus.Owned)
const blue = tube('blue', '#23308c', TubeStatus.Owned, 'Studio')
const yellow = tube('yellow', '#f3e33a', TubeStatus.Catalogue, 'Studio', 'PY3')
const red = tube('red', '#a3122e', TubeStatus.Wanted, 'Artist')
const black = tube('black', '#151515', TubeStatus.Catalogue, 'Artist')
const tubes = [white, blue, yellow, red, black]

const proposal = (extraCount: number, meanDeltaE: number | null, coverage: number, usage = {}): Proposal => ({
  extraCount,
  meanDeltaE,
  coverage,
  usage,
})

describe('collectionNames', () => {
  it('sorts the groups and puts “no group” last', () => {
    expect(collectionNames(tubes, 'en')).toEqual(['Artist', 'Studio', ''])
    expect(collectionNames([blue, red], 'en')).toEqual(['Artist', 'Studio'])
  })
})

describe('imagePaintPool', () => {
  it('keeps owned paints and those of ticked collections, never excluded ones', () => {
    const all = imagePaintPool(tubes, new Set(), DEFAULT_CALCULATION_OPTIONS)
    expect(all.map((t) => t.id)).toEqual(['white', 'blue', 'yellow', 'red'])
    const noStudio = imagePaintPool(tubes, new Set(['Studio']), DEFAULT_CALCULATION_OPTIONS)
    expect(noStudio.map((t) => t.id)).toEqual(['white', 'blue', 'red'])
    const withBlacks = imagePaintPool(tubes, new Set(), {
      ...DEFAULT_CALCULATION_OPTIONS,
      excludeBlacks: false,
    })
    expect(withBlacks.map((t) => t.id)).toContain('black')
  })
})

describe('image colours', () => {
  const pixels = new Uint8ClampedArray([
    ...[255, 0, 0, 255],
    ...[255, 0, 0, 255],
    ...[0, 0, 255, 255],
    ...[0, 0, 255, 255],
  ])

  it('reads dominant colours, or every point at the highest precision', () => {
    expect(sampleSide(0)).toBe(64)
    expect(sampleSide(5)).toBe(128)
    expect(imageTargets(pixels, 0).length).toBeLessThanOrEqual(8)
    const every = imageTargets(pixels, 5)
    expect(every.reduce((s, c) => s + c.weight, 0)).toBeCloseTo(1)
  })

  it('proposes owned paints first, then paints to buy', () => {
    const result = proposeImagePaints(imageTargets(pixels, 5), [white, blue, red])
    expect(result.owned).toContain('blue')
    expect(result.toBuy).toContain('red')
    expect(result.proposals[0]?.extraCount).toBe(0)
  })
})

describe('proposalLists', () => {
  const result: PaintProposals = {
    owned: ['white', 'blue'],
    toBuy: ['red', 'gone', 'yellow'],
    proposals: [proposal(0, 8, 0.2, { blue: 1 }), proposal(2, 4, 0.6, { white: 0.3, blue: 0.4, red: 0.3 })],
  }

  it('lists the owned paints used and the purchases of the chosen proposal', () => {
    const first = proposalLists(result, 0, tubes)
    expect(first?.owned.map((t) => t.id)).toEqual(['blue'])
    expect(first?.toBuy).toEqual([])
    const second = proposalLists(result, 1, tubes)
    expect(second?.owned.map((t) => t.id)).toEqual(['white', 'blue'])
    expect(second?.toBuy.map((t) => t.id)).toEqual(['red']) // a deleted tube is skipped
    expect(proposalLists(result, 5, tubes)).toBeNull()
  })

  it('computes the gain in faithful share over the previous proposal', () => {
    expect(coverageGain(result.proposals, 0)).toBeNull()
    expect(coverageGain(result.proposals, 1)).toBe(40)
    expect(coverageGain([proposal(0, null, 0), proposal(1, 3, 0.5)], 1)).toBeNull()
    expect(coverageGain([proposal(0, 4, 0.5), proposal(1, 3, 0.5)], 1)).toBeNull()
  })
})

describe('paintLine', () => {
  it('writes name, group and pigment', () => {
    expect(paintLine(yellow)).toBe('- yellow (Studio) (PY3)')
    expect(paintLine(white)).toBe('- white')
  })
})
