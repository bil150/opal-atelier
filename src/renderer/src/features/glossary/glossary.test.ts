import { describe, expect, it } from 'vitest'
import original from '@tests/fixtures/glossary.json'
import { Locale } from '@renderer/i18n/locale'
import { ToolPath } from '@renderer/routes'
import { GLOSSARY } from './glossary-entries'
import { buildCrossReferences, queryWords, searchGlossary } from './glossary-search'
import { GLOSSARY_THEMES, GlossaryTheme } from './glossary-theme'

const LEGACY_LINKS: Record<string, ToolPath> = {
  'couleur.html#cercle': ToolPath.ColorWheel,
  'couleur.html#theorie': ToolPath.ColorTheory,
  'couleur.html#temperature': ToolPath.ColorTemperature,
  'couleur.html#palette': ToolPath.ColorPalette,
  'etude-image.html#valeurs': ToolPath.ImageStudyValues,
  'etude-image.html#grille': ToolPath.ImageStudyGrid,
  'pantin.html#croquis': ToolPath.MannequinSketch,
  'pantin.html#poses': ToolPath.MannequinPoses,
  'pantin.html#lumiere': ToolPath.MannequinLight,
}

describe('glossary content', () => {
  it('keeps every original term, in the original order and themes', () => {
    expect(GLOSSARY).toHaveLength(original.entries.length)
    expect(GLOSSARY_THEMES).toHaveLength(original.themes.length)
    GLOSSARY.forEach((entry, i) => {
      const before = original.entries[i]!
      expect(entry.text[Locale.French]).toEqual({ term: before.term, definition: before.definition })
      expect(entry.theme).toBe(GLOSSARY_THEMES[original.themes.indexOf(before.theme)])
      expect(entry.tool).toBe(before.link ? LEGACY_LINKS[before.link] : null)
      expect(entry.crossReferenced).toBe(before.crossReferenced)
    })
  })

  it('has unique ids and unique terms in each language', () => {
    expect(new Set(GLOSSARY.map((e) => e.id)).size).toBe(GLOSSARY.length)
    for (const locale of Object.values(Locale)) {
      const terms = GLOSSARY.map((e) => e.text[locale].term.toLowerCase())
      expect(new Set(terms).size).toBe(terms.length)
    }
  })

  it('has every term translated, with a complete sentence', () => {
    for (const entry of GLOSSARY) {
      for (const locale of Object.values(Locale)) {
        const { term, definition } = entry.text[locale]
        expect(term.trim()).not.toBe('')
        expect(definition).toMatch(/[.…]$/)
      }
    }
  })

  it('uses url-safe ids', () => {
    for (const entry of GLOSSARY) expect(entry.id).toMatch(/^[a-z]+(-[a-z]+)*$/)
  })
})

describe('searchGlossary', () => {
  it('folds accents and case', () => {
    expect(queryWords('  Équilibre   GLACIS ')).toEqual(['equilibre', 'glacis'])
  })

  it('requires every word, in the term or the definition', () => {
    const ids = searchGlossary(GLOSSARY, Locale.French, 'aquarelle papier', null).map((e) => e.id)
    expect(ids).toEqual(expect.arrayContaining(['wet-on-wet', 'wet-on-dry', 'watercolour']))
    expect(ids).not.toContain('glaze')
  })

  it('searches the current language only', () => {
    expect(searchGlossary(GLOSSARY, Locale.English, 'glacis', null)).toEqual([])
    expect(searchGlossary(GLOSSARY, Locale.English, 'glaze', null).map((e) => e.id)).toContain('glaze')
  })

  it('filters by theme', () => {
    const results = searchGlossary(GLOSSARY, Locale.English, '', GlossaryTheme.Drawing)
    expect(results.length).toBeGreaterThan(0)
    expect(results.every((e) => e.theme === GlossaryTheme.Drawing)).toBe(true)
  })

  it('returns everything for an empty query', () => {
    expect(searchGlossary(GLOSSARY, Locale.French, '   ', null)).toHaveLength(GLOSSARY.length)
  })
})

describe('cross-references', () => {
  const idByFrenchTerm = new Map(GLOSSARY.map((e) => [e.text[Locale.French].term, e.id]))

  it('links the same words as the original page (French)', () => {
    const french = buildCrossReferences(GLOSSARY, Locale.French)
    GLOSSARY.forEach((entry, i) => {
      const expected = original.entries[i]!.segments.map((s) => ({
        text: s.text,
        targetId: s.target ? idByFrenchTerm.get(s.target) : null,
      }))
      expect(french.link(entry)).toEqual(expected)
    })
  })

  it('never links a term to itself, and rebuilds each definition exactly (English)', () => {
    const english = buildCrossReferences(GLOSSARY, Locale.English)
    for (const entry of GLOSSARY) {
      const segments = english.link(entry)
      expect(segments.map((s) => s.text).join('')).toBe(entry.text[Locale.English].definition)
      expect(segments.some((s) => s.targetId === entry.id)).toBe(false)
    }
  })

  it('links English terms whole-word only', () => {
    const english = buildCrossReferences(GLOSSARY, Locale.English)
    const glaze = GLOSSARY.find((e) => e.id === 'indirect-method')!
    expect(english.link(glaze).filter((s) => s.targetId)).toEqual([
      { text: 'lay-in', targetId: 'lay-in' },
      { text: 'grisaille', targetId: 'grisaille' },
    ])
  })
})
