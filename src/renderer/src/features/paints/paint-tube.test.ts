import { describe, expect, it } from 'vitest'
import original from '@tests/fixtures/image-study.json'
import { Lightfastness, Opacity } from '@renderer/lib/swatch-chart'
import {
  TubeStatus,
  groupNames,
  mixLightfastness,
  sanitizePaintTube,
  sanitizeTubeList,
  toStoredTube,
  tubeLabel,
} from './paint-tube'

const STATUS = (t: { active: boolean; want: boolean }) =>
  t.active ? TubeStatus.Owned : t.want ? TubeStatus.Wanted : TubeStatus.Catalogue

describe('sanitizeTubeList', () => {
  it('reads the original site’s tubes (ids, owned and wanted flags)', () => {
    const tubes = sanitizeTubeList(original.cleanTubeList.raw)
    expect(tubes).toHaveLength(original.cleanTubeList.tubes.length)
    tubes.forEach((t, i) => {
      const expected = original.cleanTubeList.tubes[i]!
      if (expected.id !== '<new>') expect(t.id).toBe(expected.id)
      expect(t.name).toBe(expected.name)
      expect(t.status).toBe(STATUS(expected))
    })
    expect(new Set(tubes.map((t) => t.id)).size).toBe(tubes.length)
  })

  it('caps the list at 1000 tubes', () => {
    const many = Array.from({ length: 1200 }, (_, i) => ({ name: `T${i}`, hex: '#000000' }))
    expect(sanitizeTubeList(many)).toHaveLength(1000)
    expect(sanitizeTubeList('nope')).toEqual([])
  })
})

describe('stored form', () => {
  it('round-trips through toStoredTube', () => {
    const tube = sanitizePaintTube({
      id: 'x1',
      name: 'Blue',
      pigment: 'PB29',
      hex: '#1f3a93',
      light: 'I',
      opac: 'ST',
      effect: 'metal',
      group: 'My brand',
      status: TubeStatus.Wanted,
    })!
    expect(tube.lightfastness).toBe(Lightfastness.Excellent)
    expect(tube.opacity).toBe(Opacity.SemiTransparent)
    expect(sanitizePaintTube(toStoredTube(tube))).toEqual(tube)
  })
})

describe('labels and groups', () => {
  it('labels a tube with its group', () => {
    expect(tubeLabel({ name: 'Blue', group: 'My brand' })).toBe('Blue (My brand)')
    expect(tubeLabel({ name: 'Blue', group: '' })).toBe('Blue')
  })

  it('lists distinct groups alphabetically', () => {
    const tubes = sanitizeTubeList(original.tubes)
    expect(groupNames(tubes, 'en')).toEqual(['My brand', 'Other'])
  })
})

describe('mixLightfastness', () => {
  const rate = (l: Lightfastness | null) => ({ lightfastness: l })
  it('is that of the least lightfast rated tube', () => {
    expect(mixLightfastness([rate(Lightfastness.Excellent), rate(Lightfastness.NotPermanent)])).toEqual({
      worst: Lightfastness.NotPermanent,
      partial: false,
    })
  })
  it('flags mixes where some tubes have no rating', () => {
    expect(mixLightfastness([rate(Lightfastness.VeryGood), rate(null)])).toEqual({
      worst: Lightfastness.VeryGood,
      partial: true,
    })
    expect(mixLightfastness([rate(null)])).toBeNull()
  })
})
