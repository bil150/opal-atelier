/**
 * Characterisation tests against the original site's swatch-chart and tube-text modules
 * (outputs captured in tests/fixtures/swatch-chart.json), plus the behaviour changes made on purpose.
 */
import { describe, expect, it } from 'vitest'
import original from '@tests/fixtures/swatch-chart.json'
import {
  ImportFailure,
  Opacity,
  TUBE_LIMITS,
  TubeRejection,
  cleanTube,
  effectiveEffect,
  exampleSwatchChart,
  exportSwatchChart,
  importSwatchChart,
  parseHex,
  readTubeText,
  toLightfastness,
  toOpacity,
  toSurfaceEffect,
  type Tube,
} from '.'

/** Original module used '' for "unknown"; the port uses null. */
const orNull = (value: string) => (value === '' ? null : value)

const LEGACY_REJECTIONS: Record<string, TubeRejection> = {
  'entrée invalide (un objet est attendu)': TubeRejection.NotAnObject,
  'nom manquant': TubeRejection.MissingName,
  'couleur « hex » absente ou invalide (attendu : #RRGGBB)': TubeRejection.InvalidColour,
  'doublon dans le fichier (même groupe et même nom)': TubeRejection.Duplicate,
}

interface LegacyTube {
  name: string
  pigment: string
  hex: string
  light: string
  opac: string
  effect: string
  group: string
}

const fromLegacy = (t: LegacyTube): Tube => ({
  name: t.name,
  pigment: t.pigment,
  hex: t.hex,
  lightfastness: toLightfastness(t.light),
  opacity: toOpacity(t.opac),
  effect: toSurfaceEffect(t.effect),
  group: t.group,
})

describe('limits', () => {
  it('match the original ones', () => {
    expect(TUBE_LIMITS).toEqual({
      name: original.limits.name,
      pigment: original.limits.pigment,
      group: original.limits.group,
      tubesPerFile: original.limits.tubes,
    })
  })
})

describe('field parsers', () => {
  it.each(original.parseHex)('parseHex($input)', ({ input, output }) => {
    expect(parseHex(input)).toBe(output)
  })

  it.each(original.light)('toLightfastness($input)', ({ input, output }) => {
    expect(toLightfastness(input === '__undefined__' ? undefined : input)).toBe(orNull(output))
  })

  it.each(original.opacity)('toOpacity($input)', ({ input, output }) => {
    expect(toOpacity(input)).toBe(orNull(output))
  })

  it.each(original.effect)('toSurfaceEffect($input)', ({ input, output }) => {
    expect(toSurfaceEffect(input)).toBe(orNull(output))
  })

  it.each(original.effectKind)('effectiveEffect($tube)', ({ tube, output }) => {
    expect(effectiveEffect(tube ?? {})).toBe(orNull(output))
  })
})

describe('cleanTube', () => {
  it.each(original.cleanTube)('cleanTube($input)', ({ input, fileGroup, output }) => {
    const result = cleanTube(input, fileGroup)
    if ('error' in output) {
      expect(result).toEqual({ ok: false, reason: LEGACY_REJECTIONS[output.error] })
    } else {
      expect(result).toEqual({ ok: true, tube: fromLegacy(output.tube) })
    }
  })
})

describe('importSwatchChart', () => {
  const LEGACY_FAILURES: Record<string, ImportFailure> = {
    'Rien à importer.': ImportFailure.Empty,
    'JSON invalide': ImportFailure.InvalidJson,
    'Aucune liste « tubes » dans ce JSON.': ImportFailure.NoTubeList,
    'Trop de tubes (1001, maximum 1000).': ImportFailure.TooManyTubes,
  }

  it.each(original.parse.map((c, i) => ({ ...c, i })))('import case #$i', ({ input, output }) => {
    const result = importSwatchChart(input)
    if (output.fatal) {
      expect(result).toMatchObject({ ok: false, failure: LEGACY_FAILURES[output.fatal] })
      return
    }
    expect(result).toEqual({
      ok: true,
      tubes: (output.tubes as LegacyTube[]).map(fromLegacy),
      rejected: output.errors.map((e) => ({
        position: e.index,
        name: e.name,
        reason: LEGACY_REJECTIONS[e.reason],
      })),
      groups: output.groups,
    })
  })

  it('reports how many tubes a too-large file has', () => {
    const big = JSON.stringify({ tubes: Array.from({ length: 1001 }, () => ({ name: 'T', hex: '#000' })) })
    expect(importSwatchChart(big)).toEqual({ ok: false, failure: ImportFailure.TooManyTubes, count: 1001 })
  })

  it('round-trips with exportSwatchChart', () => {
    const imported = importSwatchChart(JSON.stringify(exampleSwatchChart()))
    expect(imported.ok).toBe(true)
    if (!imported.ok) return
    const again = importSwatchChart(JSON.stringify(exportSwatchChart(imported.tubes, 'My brand')))
    expect(again).toEqual(imported)
  })
})

describe('exportSwatchChart', () => {
  const tubes = original.tubesToBuild.map(fromLegacy)
  it.each(original.build)('group $group', ({ group, output }) => {
    expect(exportSwatchChart(tubes, group)).toEqual(output)
  })
})

describe('exampleSwatchChart', () => {
  it('is a made-up, brand-free template that imports cleanly', () => {
    const example = exampleSwatchChart()
    expect(example.group).toBe('My brand')
    const result = importSwatchChart(JSON.stringify(example))
    expect(result).toMatchObject({ ok: true, rejected: [] })
  })
})

describe('readTubeText', () => {
  const toPort = (o: { name: string; pigment: string; light: string; opac: string }) => ({
    name: o.name,
    pigment: o.pigment,
    lightfastness: orNull(o.light),
    opacity: orNull(o.opac),
  })

  // Original bug, fixed on purpose: "\b" after "é" never matched, so "Opacité : T" was read as a name.
  const FIXED = ['Opacité : T']
  const unchanged = original.tubeText.filter((c) => !FIXED.includes(c.lines[0] ?? ''))

  it.each(unchanged)('reads $lines', ({ lines, output }) => {
    expect(readTubeText(lines)).toEqual(toPort(output))
  })

  it('understands the French "Opacité" label (fixed)', () => {
    expect(readTubeText(['Opacité : T', 'Bleu de Prusse', 'PB27'])).toEqual({
      name: 'Bleu de Prusse',
      pigment: 'PB27',
      lightfastness: null,
      opacity: Opacity.Transparent,
    })
  })

  it('normalises a lower-case labelled abbreviation', () => {
    expect(readTubeText(['Some Blue', 'Opacity: st']).opacity).toBe(Opacity.SemiTransparent)
  })
})
