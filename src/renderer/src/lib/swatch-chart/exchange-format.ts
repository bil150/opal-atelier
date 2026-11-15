/**
 * Swatch-chart exchange format (JSON). Kept identical to the original site's format
 * (`"type": "nuancier"`, short field names) so charts exported there still import here.
 *
 *   { "type": "nuancier", "version": 1, "group": "My brand",
 *     "tubes": [{ "name": "…", "pigment": "PB29", "hex": "#1f3a93", "light": "I", "opac": "ST", "effect": "metal" }] }
 */
import { TUBE_LIMITS, TubeRejection, cleanText, cleanTube, type Tube } from './tube'

export const EXCHANGE_TYPE = 'nuancier'
export const EXCHANGE_VERSION = 1

export interface ExchangeTube {
  group?: string
  name: string
  pigment: string
  hex: string
  light: string
  opac: string
  effect?: string
}

export interface ExchangeFile {
  type: typeof EXCHANGE_TYPE
  version: typeof EXCHANGE_VERSION
  group?: string
  tubes: ExchangeTube[]
}

/** Why a whole file could not be imported. */
export enum ImportFailure {
  Empty = 'empty',
  InvalidJson = 'invalid-json',
  NoTubeList = 'no-tube-list',
  TooManyTubes = 'too-many-tubes',
}

export interface RejectedTube {
  /** 1-based position in the file. */
  readonly position: number
  /** Name as found in the file (truncated), for display; may be empty. */
  readonly name: string
  readonly reason: TubeRejection
}

export type ImportResult =
  | {
      readonly ok: true
      readonly tubes: readonly Tube[]
      readonly rejected: readonly RejectedTube[]
      /** Distinct groups of the imported tubes, in order of appearance. */
      readonly groups: readonly string[]
    }
  | { readonly ok: false; readonly failure: ImportFailure; readonly count?: number }

/** Removes ```json fences and surrounding prose (as in AI chat answers), then parses. */
function parseLenientJson(text: string): unknown {
  const raw = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '')
  try {
    return JSON.parse(raw) as unknown
  } catch {
    const start = raw.search(/[{[]/)
    const end = Math.max(raw.lastIndexOf('}'), raw.lastIndexOf(']'))
    if (start < 0 || end <= start) return undefined
    try {
      return JSON.parse(raw.slice(start, end + 1)) as unknown
    } catch {
      return undefined
    }
  }
}

/** Text of a file or a paste → tubes, with the reason for each rejected entry. */
export function importSwatchChart(text: string): ImportResult {
  const trimmed = text.trim()
  if (!trimmed) return { ok: false, failure: ImportFailure.Empty }
  const data = parseLenientJson(trimmed)
  if (data === undefined) return { ok: false, failure: ImportFailure.InvalidJson }

  const isList = Array.isArray(data)
  const record =
    !isList && typeof data === 'object' && data !== null ? (data as Record<string, unknown>) : null
  const list: unknown = isList ? data : record?.tubes
  if (!Array.isArray(list)) return { ok: false, failure: ImportFailure.NoTubeList }
  if (list.length > TUBE_LIMITS.tubesPerFile)
    return { ok: false, failure: ImportFailure.TooManyTubes, count: list.length }

  const fileGroup = record ? cleanText(record.group, TUBE_LIMITS.group) : ''
  const tubes: Tube[] = []
  const rejected: RejectedTube[] = []
  const seen = new Set<string>()
  list.forEach((raw: unknown, i) => {
    const position = i + 1
    const result = cleanTube(raw, fileGroup)
    if (!result.ok) {
      const rawName = (raw as { name?: unknown } | null)?.name
      rejected.push({
        position,
        name: typeof rawName === 'string' ? rawName.slice(0, 40) : '',
        reason: result.reason,
      })
      return
    }
    const key = `${result.tube.group.toLowerCase()}|${result.tube.name.toLowerCase()}`
    if (seen.has(key)) {
      rejected.push({ position, name: result.tube.name, reason: TubeRejection.Duplicate })
      return
    }
    seen.add(key)
    tubes.push(result.tube)
  })
  return { ok: true, tubes, rejected, groups: [...new Set(tubes.map((t) => t.group))] }
}

/**
 * Tubes → file content. `group`: a group name (the file carries it), '' for "no group",
 * or null for every group (each tube then carries its own).
 */
export function exportSwatchChart(tubes: readonly Tube[], group: string | null): ExchangeFile {
  return {
    type: EXCHANGE_TYPE,
    version: EXCHANGE_VERSION,
    ...(group ? { group } : {}),
    tubes: tubes.map((t) => ({
      ...(group === null && t.group ? { group: t.group } : {}),
      name: t.name,
      pigment: t.pigment,
      hex: t.hex,
      light: t.lightfastness ?? '',
      opac: t.opacity ?? '',
      ...(t.effect ? { effect: t.effect } : {}),
    })),
  }
}

/** Made-up example for the documentation and the downloadable template (never added to the user's tubes). */
export function exampleSwatchChart(): ExchangeFile {
  return {
    type: EXCHANGE_TYPE,
    version: EXCHANGE_VERSION,
    group: 'My brand',
    tubes: [
      { name: 'Example blue', pigment: 'PB29', hex: '#1F3A93', light: 'I', opac: 'ST' },
      { name: 'Example yellow', pigment: 'PY35', hex: '#F2C500', light: 'I', opac: 'O' },
      { name: 'Example green (two pigments)', pigment: 'PG7/PY3', hex: '#2E8B57', light: '', opac: '' },
    ],
  }
}
