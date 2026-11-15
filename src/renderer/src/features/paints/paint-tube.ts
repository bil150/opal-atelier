/**
 * A tube in the user's inventory: a swatch-chart tube plus an id and a status.
 * Nothing is preset: users enter or import their own tubes.
 */
import {
  Lightfastness,
  TUBE_LIMITS,
  cleanText,
  cleanTube,
  type ExchangeTube,
  type Tube,
} from '@renderer/lib/swatch-chart'

export enum TubeStatus {
  /** "I have it": used in the calculations. */
  Owned = 'owned',
  /** On the shopping list. */
  Wanted = 'wanted',
  /** Known from a chart, neither owned nor wanted. */
  Catalogue = 'catalogue',
}

export interface PaintTube extends Tube {
  readonly id: string
  readonly status: TubeStatus
}

export const MAX_TUBES = TUBE_LIMITS.tubesPerFile
const MAX_ID = 40

export function newTubeId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

const isStatus = (value: unknown): value is TubeStatus =>
  (Object.values(TubeStatus) as unknown[]).includes(value)

/**
 * Raw tube (storage, backup file) → valid tube, or null. Accepts this app's `status` and the original
 * site's `active` / `want` flags (owned unless explicitly not; wanted only if not owned).
 */
export function sanitizePaintTube(raw: unknown): PaintTube | null {
  if (typeof raw !== 'object' || raw === null) return null
  const result = cleanTube(raw, '')
  if (!result.ok) return null
  const r = raw as Record<string, unknown>
  const id = typeof r.id === 'string' && r.id ? r.id.slice(0, MAX_ID) : newTubeId()
  let status: TubeStatus
  if (isStatus(r.status)) status = r.status
  else if (r.active !== false) status = TubeStatus.Owned
  else status = r.want === true ? TubeStatus.Wanted : TubeStatus.Catalogue
  return { ...result.tube, id, status }
}

/** List from storage or a file: validated, capped, with unique ids. */
export function sanitizeTubeList(list: unknown): PaintTube[] {
  if (!Array.isArray(list)) return []
  const seen = new Set<string>()
  return list
    .slice(0, MAX_TUBES)
    .map(sanitizePaintTube)
    .filter((t): t is PaintTube => t !== null)
    .map((t) => {
      const unique = seen.has(t.id) ? { ...t, id: newTubeId() } : t
      seen.add(unique.id)
      return unique
    })
}

/** Stored form: the exchange format's field names, plus id and status. */
export function toStoredTube(t: PaintTube): ExchangeTube & { id: string; status: TubeStatus } {
  return {
    id: t.id,
    status: t.status,
    name: t.name,
    pigment: t.pigment,
    hex: t.hex,
    light: t.lightfastness ?? '',
    opac: t.opacity ?? '',
    ...(t.effect ? { effect: t.effect } : {}),
    group: t.group,
  }
}

/** "Name (Group)", as copied or listed. */
export function tubeLabel(t: Pick<Tube, 'name' | 'group'>): string {
  return t.group ? `${t.name} (${t.group})` : t.name
}

export function normaliseGroup(group: string): string {
  return cleanText(group, TUBE_LIMITS.group)
}

/** Distinct groups, sorted alphabetically in the given locale. */
export function groupNames(tubes: readonly PaintTube[], locale: string): string[] {
  return [...new Set(tubes.map((t) => t.group).filter(Boolean))].sort((a, b) => a.localeCompare(b, locale))
}

const LIGHTFASTNESS_RANK: Readonly<Record<Lightfastness, number>> = {
  [Lightfastness.Excellent]: 1,
  [Lightfastness.VeryGood]: 2,
  [Lightfastness.NotPermanent]: 3,
}

/**
 * Lightfastness of a mix: that of its least lightfast rated tube. `partial` when some tubes have no
 * rating. Null when none is rated. Opacity is not combined: averaging it would be an unverified guess.
 */
export function mixLightfastness(tubes: readonly Pick<Tube, 'lightfastness'>[]): {
  readonly worst: Lightfastness
  readonly partial: boolean
} | null {
  const rated = tubes.map((t) => t.lightfastness).filter((l): l is Lightfastness => l !== null)
  if (!rated.length) return null
  const worst = rated.reduce((w, l) => (LIGHTFASTNESS_RANK[l] > LIGHTFASTNESS_RANK[w] ? l : w))
  return { worst, partial: rated.length < tubes.length }
}
