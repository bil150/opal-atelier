/**
 * Glossary search (accent- and case-insensitive, every word must match) and cross-references
 * (a term defined elsewhere becomes a link in other definitions). Pure functions.
 */
import type { Locale } from '@renderer/i18n/locale'
import { foldText } from '@renderer/lib/swatch-chart'
import type { GlossaryEntry } from './glossary-entries'
import type { GlossaryTheme } from './glossary-theme'

/** Words of a query, folded (no accents, lower case). */
export function queryWords(query: string): string[] {
  return foldText(query).split(/\s+/).filter(Boolean)
}

/** Entries of `theme` (or all when null) whose term or definition contains every word of the query. */
export function searchGlossary(
  entries: readonly GlossaryEntry[],
  locale: Locale,
  query: string,
  theme: GlossaryTheme | null,
): GlossaryEntry[] {
  const words = queryWords(query)
  return entries.filter((entry) => {
    if (theme && entry.theme !== theme) return false
    const { term, definition } = entry.text[locale]
    const haystack = foldText(`${term} ${definition}`)
    return words.every((word) => haystack.includes(word))
  })
}

/** A piece of a definition: plain text, or text linking to another entry. */
export interface DefinitionSegment {
  readonly text: string
  readonly targetId: string | null
}

export interface CrossReferenceIndex {
  readonly link: (entry: GlossaryEntry) => DefinitionSegment[]
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Prepares cross-references for one language: each term is looked for as a whole word, any case,
 * longest terms first, first occurrence only, without overlaps.
 */
export function buildCrossReferences(entries: readonly GlossaryEntry[], locale: Locale): CrossReferenceIndex {
  const patterns = entries
    .filter((entry) => entry.crossReferenced)
    .map((entry) => ({ entry, term: entry.text[locale].term }))
    .sort((a, b) => b.term.length - a.term.length)
    .map(({ entry, term }) => ({
      entry,
      pattern: new RegExp(`(?<![\\p{L}])${escapeRegExp(term)}(?![\\p{L}])`, 'iu'),
    }))

  const link = (entry: GlossaryEntry): DefinitionSegment[] => {
    const { definition } = entry.text[locale]
    const found: { start: number; end: number; targetId: string }[] = []
    for (const { entry: other, pattern } of patterns) {
      if (other === entry) continue
      const match = pattern.exec(definition)
      if (!match) continue
      const start = match.index
      const end = start + match[0].length
      if (found.some((f) => start < f.end && end > f.start)) continue
      found.push({ start, end, targetId: other.id })
    }
    found.sort((a, b) => a.start - b.start)

    const segments: DefinitionSegment[] = []
    let position = 0
    for (const f of found) {
      if (f.start > position) segments.push({ text: definition.slice(position, f.start), targetId: null })
      segments.push({ text: definition.slice(f.start, f.end), targetId: f.targetId })
      position = f.end
    }
    if (position < definition.length) segments.push({ text: definition.slice(position), targetId: null })
    return segments
  }

  return { link }
}
