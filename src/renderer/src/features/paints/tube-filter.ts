/** Filtering the tube list by status and by a search. */
import { foldText } from '@renderer/lib/swatch-chart'
import { TubeStatus, type PaintTube } from './paint-tube'

export enum TubeFilter {
  All = 'all',
  Owned = 'owned',
  Wanted = 'wanted',
  Catalogue = 'catalogue',
}

const FILTER_STATUS: Readonly<Record<Exclude<TubeFilter, TubeFilter.All>, TubeStatus>> = {
  [TubeFilter.Owned]: TubeStatus.Owned,
  [TubeFilter.Wanted]: TubeStatus.Wanted,
  [TubeFilter.Catalogue]: TubeStatus.Catalogue,
}

/** Name, group, pigment or colour code; accent- and case-insensitive; every word must match. */
export function matchesTubeQuery(t: PaintTube, words: readonly string[]): boolean {
  if (!words.length) return true
  const haystack = foldText([t.name, t.group, t.pigment, t.hex].join(' '))
  return words.every((w) => haystack.includes(w))
}

export function matchesFilter(t: PaintTube, filter: TubeFilter): boolean {
  return filter === TubeFilter.All || t.status === FILTER_STATUS[filter]
}
