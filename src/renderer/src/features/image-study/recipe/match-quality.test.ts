import { describe, expect, it } from 'vitest'
import original from '@tests/fixtures/image-study.json'
import { sanitizeTubeList } from '@renderer/features/paints/paint-tube'
import {
  MatchQuality,
  formatDeltaE,
  matchQuality,
  qualityBar,
  qualityTone,
  sortByColour,
} from './match-quality'

const LEGACY_QUALITY: Record<string, MatchQuality> = {
  Excellent: MatchQuality.Excellent,
  'Très bon': MatchQuality.VeryGood,
  Bon: MatchQuality.Good,
  Approximatif: MatchQuality.Approximate,
  Éloigné: MatchQuality.Far,
}

describe('matchQuality (as the original page)', () => {
  it.each(original.quality)('ΔE $de', ({ de, quality }) => {
    expect(matchQuality(de)).toBe(LEGACY_QUALITY[quality[0]!])
  })

  it('colours good and far results', () => {
    expect(qualityTone(MatchQuality.VeryGood)).toBe('good')
    expect(qualityTone(MatchQuality.Good)).toBe('neutral')
    expect(qualityTone(MatchQuality.Far)).toBe('bad')
  })

  it('fills the bar from ΔE 20 (almost empty) to 0 (full)', () => {
    expect(qualityBar(0)).toBe(100)
    expect(qualityBar(10)).toBe(50)
    expect(qualityBar(40)).toBe(4)
  })
})

describe('sortByColour', () => {
  it('orders paints like the original list', () => {
    const tubes = sanitizeTubeList(original.tubes).map((t, i) => ({ ...t, id: original.tubes[i]!.id }))
    expect(sortByColour(tubes, 'fr').map((t) => t.id)).toEqual(original.sortPaints)
  })
})

describe('formatDeltaE', () => {
  it('keeps one decimal in the reader’s format', () => {
    expect(formatDeltaE(2.46, 'en')).toBe('2.5')
    expect(formatDeltaE(2.46, 'fr')).toBe('2,5')
    expect(formatDeltaE(3, 'en')).toBe('3.0')
  })
})
