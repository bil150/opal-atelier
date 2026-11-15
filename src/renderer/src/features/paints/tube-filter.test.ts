import { describe, expect, it } from 'vitest'
import { TubeStatus, sanitizePaintTube } from './paint-tube'
import { TubeFilter, matchesFilter, matchesTubeQuery } from './tube-filter'

const tube = sanitizePaintTube({
  name: 'Bleu céruléen',
  group: 'My brand',
  pigment: 'PB35',
  hex: '#3d8cc4',
  status: TubeStatus.Wanted,
})!

describe('tube filters', () => {
  it('filters by status', () => {
    expect(matchesFilter(tube, TubeFilter.All)).toBe(true)
    expect(matchesFilter(tube, TubeFilter.Wanted)).toBe(true)
    expect(matchesFilter(tube, TubeFilter.Owned)).toBe(false)
    expect(matchesFilter(tube, TubeFilter.Catalogue)).toBe(false)
  })

  it('searches name, group, pigment and colour code, every word, without accents', () => {
    expect(matchesTubeQuery(tube, [])).toBe(true)
    expect(matchesTubeQuery(tube, ['ceruleen', 'brand'])).toBe(true)
    expect(matchesTubeQuery(tube, ['pb35'])).toBe(true)
    expect(matchesTubeQuery(tube, ['#3d8c'])).toBe(true)
    expect(matchesTubeQuery(tube, ['ceruleen', 'red'])).toBe(false)
  })
})
