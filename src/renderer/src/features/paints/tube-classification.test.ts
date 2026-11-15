import { describe, expect, it } from 'vitest'
import original from '@tests/fixtures/image-study.json'
import { cleanTube, type Tube } from '@renderer/lib/swatch-chart'
import { DEFAULT_CALCULATION_OPTIONS, Exclusion, exclusionOf, isBlackTube } from './tube-classification'

function tube(raw: unknown): Tube {
  const r = cleanTube(raw)
  if (!r.ok) throw new Error('invalid test tube')
  return r.tube
}

describe('isBlackTube (as the original page)', () => {
  it.each(original.black)('$name → $black', ({ name, black }) => {
    expect(isBlackTube(tube(original.tubes.find((t) => t.name === name)))).toBe(black)
  })
})

describe('exclusionOf', () => {
  const gold = tube({ name: 'Gold', pigment: 'PM1', hex: '#c9a227' })
  const black = tube({ name: 'Ivory black', pigment: 'PBk9', hex: '#24221f' })
  const lemon = tube({ name: 'Lemon', pigment: 'PY3', hex: '#f3e23b' })

  it('leaves out blacks and effect paints by default', () => {
    expect(exclusionOf(black, DEFAULT_CALCULATION_OPTIONS)).toBe(Exclusion.Black)
    expect(exclusionOf(gold, DEFAULT_CALCULATION_OPTIONS)).toBe(Exclusion.Effect)
    expect(exclusionOf(lemon, DEFAULT_CALCULATION_OPTIONS)).toBeNull()
  })

  it('keeps them when the options say so', () => {
    const all = { excludeBlacks: false, excludeEffects: false }
    expect(exclusionOf(black, all)).toBeNull()
    expect(exclusionOf(gold, all)).toBeNull()
  })
})
