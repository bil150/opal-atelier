/**
 * Characterisation tests against the original Colour page (outputs captured in
 * tests/fixtures/color-theory.json by running its own functions with the original engine).
 */
import { describe, expect, it } from 'vitest'
import original from '@tests/fixtures/color-theory.json'
import { GENERIC_PAINTS, PAINT_FAMILIES } from '@renderer/features/paints/generic-paints'
import { Locale } from '@renderer/i18n/locale'
import {
  Harmony,
  HueRank,
  Temperature,
  TemperatureAction,
  additionRatio,
  bestAddition,
  chooseAgent,
  complementOf,
  convexHull,
  desaturate,
  fromOklab,
  gamutPoint,
  grabbedOffset,
  greyingDoses,
  harmonyAngles,
  hexToRgb01,
  hsv,
  hueSlot,
  mixPaints,
  neighbourTowards,
  painterColor,
  paletteReach,
  polygonArea,
  reachArea,
  reduceParts,
  sectorPath,
  temperatureOf,
  toOklab,
  warmth,
  type Point,
  type Rgb01,
} from '.'

const P = 5
const close = (actual: readonly number[], expected: readonly number[], precision = P) => {
  expect(actual).toHaveLength(expected.length)
  actual.forEach((v, i) => expect(v).toBeCloseTo(expected[i]!, precision))
}
const LEGACY_FAMILIES = [...new Set(original.generics.map((g) => g.family))]
const genericByFrenchName = new Map(GENERIC_PAINTS.map((p) => [p.name[Locale.French], p]))
const generics = GENERIC_PAINTS.map((p) => ({ id: p.id, hex: p.hex }))

describe('generic paints', () => {
  it('are the original list: same names, pigments, shades, families and order', () => {
    expect(GENERIC_PAINTS).toHaveLength(original.generics.length)
    GENERIC_PAINTS.forEach((p, i) => {
      const g = original.generics[i]!
      expect(p.name[Locale.French]).toBe(g.name)
      expect(p.pigment).toBe(g.pigment)
      expect(p.hex).toBe(g.hex)
      expect(PAINT_FAMILIES.indexOf(p.family)).toBe(LEGACY_FAMILIES.indexOf(g.family))
    })
  })
})

describe('OKLab', () => {
  it.each(original.oklab)('$hex', ({ hex, lab, back, desat50 }) => {
    const c = hexToRgb01(hex)
    close(toOklab(c), lab)
    close(fromOklab(toOklab(c)), back)
    close(desaturate(c, 0.5), desat50)
  })
})

describe('wheels', () => {
  it.each(original.painter)('painter wheel at $angle°', ({ angle, rgb }) => close(painterColor(angle), rgb))
  it.each(original.hsv)('light wheel at $angle°', ({ angle, rgb }) => close(hsv(angle, 1, 1), rgb))

  it('names the 12 hues and ranks them', () => {
    expect(hueSlot(0)).toEqual({ index: 0, rank: HueRank.Primary })
    expect(hueSlot(60)).toEqual({ index: 2, rank: HueRank.Secondary })
    expect(hueSlot(30)).toEqual({ index: 1, rank: HueRank.Tertiary })
    expect(hueSlot(355)).toEqual({ index: 0, rank: null })
  })
})

describe('harmonies', () => {
  it('places every colour around the base', () => {
    expect(harmonyAngles(Harmony.SplitComplementary, 30)).toEqual([30, 180, 240])
    expect(harmonyAngles(Harmony.Analogous, 0)).toEqual([330, 0, 30])
  })

  it('grabs the nearest marker, or moves the base colour', () => {
    expect(grabbedOffset(Harmony.Triad, 0, 125)).toBe(120)
    expect(grabbedOffset(Harmony.Triad, 0, 60)).toBe(0)
  })
})

describe('geometry', () => {
  it.each(original.sector)('sector $args', ({ args, d }) => {
    const [a0, a1, ro, ri] = args as [number, number, number, number]
    expect(sectorPath(a0, a1, ro, ri)).toBe(d)
  })

  it('computes the convex hull and its area', () => {
    const hull = convexHull(original.hull.points as unknown as Point[])
    expect(hull).toEqual(original.hull.hull)
    expect(polygonArea(hull)).toBeCloseTo(original.hull.area, P)
  })
})

describe('paint mixing', () => {
  it.each(original.mix)('mixes $hexes in $w', ({ hexes, w, rgb }) => close(mixPaints(hexes, w), rgb))
  it.each(original.reduceParts)('reduceParts($parts)', ({ parts, reduced }) =>
    expect(reduceParts(parts)).toEqual(reduced),
  )
  it.each(original.ratio)('additionRatio($f)', ({ f, ratio }) => expect(additionRatio(f)).toEqual(ratio))
})

describe('limited palette', () => {
  it.each(original.gamut)('gamutPoint($hex)', ({ hex, p, C, ang }) => {
    const g = gamutPoint(hexToRgb01(hex))
    close(g.point, p)
    expect(g.chroma).toBeCloseTo(C, P)
    expect(g.angle).toBeCloseTo(ang, P)
  })

  it.each(original.reachArea)('reachArea($hexes, white: $white)', ({ hexes, white, area }) => {
    expect(reachArea(hexes, white)).toBeCloseTo(area, 6)
  })

  it.each(original.paletteReach)('paletteReach($hexes, white: $white)', (expected) => {
    const reach = paletteReach(expected.hexes, expected.white)
    expect(reach.samples).toHaveLength(expected.count)
    reach.samples.slice(0, expected.first.length).forEach((s, i) => {
      close(s.color, expected.first[i]!.c)
      close(s.gamut.point, expected.first[i]!.p)
    })
    expect(reach.hull).toHaveLength(expected.hull.length)
    reach.hull.forEach((p, i) => close(p, expected.hull[i]!))
    expect(reach.vivid).toEqual(expected.vivid)
    expect(reach.missing).toEqual(expected.missing)
  })

  it.each(original.bestNext)('bestAddition($hexes, white: $white)', ({ hexes, white, best }) => {
    expect(bestAddition(hexes, generics, white)?.id).toBe(genericByFrenchName.get(best)?.id)
  })
})

describe('temperature', () => {
  const LEGACY_LABELS: Record<string, Temperature> = {
    chaude: Temperature.Warm,
    froide: Temperature.Cool,
    intermédiaire: Temperature.Intermediate,
    grise: Temperature.Neutral,
  }
  const idOf = (name: string | null) => (name ? genericByFrenchName.get(name)!.id : null)

  it.each(original.temperature)('$name', (expected) => {
    const base = generics[original.temperature.indexOf(expected)]!
    const rgb: Rgb01 = hexToRgb01(base.hex)
    expect(warmth(rgb)).toBeCloseTo(expected.warmth, P)
    expect(temperatureOf(rgb)).toBe(LEGACY_LABELS[expected.label])
    expect(neighbourTowards(base, 55, generics)?.id ?? null).toBe(idOf(expected.warmer))
    expect(neighbourTowards(base, 235, generics)?.id ?? null).toBe(idOf(expected.cooler))
    const complement = complementOf(base, generics)
    expect(complement?.id ?? null).toBe(idOf(expected.complement))
    if (complement && expected.greyDoses) close(greyingDoses(base.hex, complement.hex), expected.greyDoses)
  })

  it('explains why nothing can be added', () => {
    const white = generics[0]!
    expect(chooseAgent(TemperatureAction.Grey, white, generics)).toMatchObject({
      agent: null,
      reason: 'already-neutral',
    })
    expect(chooseAgent(TemperatureAction.Warm, white, generics)).toMatchObject({
      agent: null,
      reason: 'already-warmest',
    })
  })
})
