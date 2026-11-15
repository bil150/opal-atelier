/** Paints the colour tools can pick from: generic colours, or the user's inventory. */
import type { Locale } from '@renderer/i18n/locale'
import type { PaintColor } from '@renderer/lib/color-theory'
import { foldText } from '@renderer/lib/swatch-chart'
import { GENERIC_PAINTS, type PaintFamily } from './generic-paints'
import { TubeStatus, type PaintTube } from './paint-tube'

export enum PaintSource {
  Generic = 'generic',
  Inventory = 'inventory',
}

export function isPaintSource(value: unknown): value is PaintSource {
  return value === PaintSource.Generic || value === PaintSource.Inventory
}

export interface PaintOption extends PaintColor {
  readonly name: string
  /** Pigment code, then group (e.g. a brand the user typed), joined for display. */
  readonly detail: string
  /** Generic colours only. */
  readonly family: PaintFamily | null
  /** Inventory tubes the user marked as owned; generic colours count as owned. */
  readonly owned: boolean
}

/** Default generic colours for each slot: printing primaries first. */
export const DEFAULT_GENERIC_IDS: readonly string[] = [
  'primary-cyan',
  'primary-magenta',
  'primary-yellow',
  'primary-red',
  'ultramarine-blue',
  'phthalo-green',
  'yellow-ochre',
  'burnt-sienna',
]

export function paintOptions(
  source: PaintSource,
  locale: Locale,
  inventory: readonly PaintTube[],
): PaintOption[] {
  if (source === PaintSource.Generic) {
    return GENERIC_PAINTS.map((p) => ({
      id: p.id,
      hex: p.hex,
      name: p.name[locale],
      detail: p.pigment,
      family: p.family,
      owned: true,
    }))
  }
  return inventory.map((t) => ({
    id: t.id,
    hex: t.hex,
    name: t.name,
    detail: [t.pigment, t.group].filter(Boolean).join(' · '),
    family: null,
    owned: t.status === TubeStatus.Owned,
  }))
}

/** Owned tubes first, then the others. */
export function ownedFirst<T extends { readonly owned: boolean }>(options: readonly T[]): T[] {
  return [...options.filter((o) => o.owned), ...options.filter((o) => !o.owned)]
}

/**
 * The paint in slot `index`: the stored id if it still exists in the list, otherwise a sensible default
 * (the default generic colour of that slot, or the index-th tube, owned ones first).
 */
export function resolveSlot(
  id: string,
  index: number,
  source: PaintSource,
  options: readonly PaintOption[],
): PaintOption | null {
  const found = options.find((o) => o.id === id)
  if (found) return found
  if (source === PaintSource.Generic) return options.find((o) => o.id === DEFAULT_GENERIC_IDS[index]) ?? null
  return ownedFirst(options)[index] ?? options[0] ?? null
}

/** Accent- and case-insensitive search: every word must appear in name, detail or hex. */
export function matchesPaint(option: PaintOption, query: string, familyLabel = ''): boolean {
  const words = foldText(query).split(/\s+/).filter(Boolean)
  const haystack = foldText([option.name, option.detail, familyLabel, option.hex].join(' '))
  return words.every((w) => haystack.includes(w))
}
