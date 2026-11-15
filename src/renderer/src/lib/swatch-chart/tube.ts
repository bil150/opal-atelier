/**
 * A paint tube as users enter or import it, and the rules that clean raw input into one.
 * This module is the single source of truth for tube validation (import and storage alike).
 */

/** ASTM lightfastness rating. */
export enum Lightfastness {
  Excellent = 'I',
  VeryGood = 'II',
  NotPermanent = 'III',
}

/** Transparency / opacity, as printed on manufacturers' charts. */
export enum Opacity {
  Transparent = 'T',
  SemiTransparent = 'ST',
  SemiOpaque = 'SO',
  Opaque = 'O',
}

/** Surface effect. `None` forces "no effect" even if the name suggests one. */
export enum SurfaceEffect {
  Metallic = 'metal',
  Iridescent = 'iri',
  Fluorescent = 'fluo',
  None = 'none',
}

/** Effects that change how a colour looks (everything but `None`). */
export type VisibleEffect = Exclude<SurfaceEffect, SurfaceEffect.None>

export interface Tube {
  readonly name: string
  /** Colour Index code(s), e.g. "PB29" or "PR122/PV19"; empty when unknown. */
  readonly pigment: string
  /** Lower-case #rrggbb. */
  readonly hex: string
  readonly lightfastness: Lightfastness | null
  readonly opacity: Opacity | null
  /** Declared effect; null means "not stated" (then guessed from the name, see effectiveEffect). */
  readonly effect: SurfaceEffect | null
  /** User-defined group, typically a brand typed by the user; empty for none. */
  readonly group: string
}

export const TUBE_LIMITS = {
  name: 60,
  pigment: 20,
  group: 40,
  tubesPerFile: 1000,
} as const

/** Why a raw tube was rejected. */
export enum TubeRejection {
  NotAnObject = 'not-an-object',
  MissingName = 'missing-name',
  InvalidColour = 'invalid-colour',
  /** Same group and same name as an earlier tube of the file. */
  Duplicate = 'duplicate',
}

export type CleanTubeResult =
  { readonly ok: true; readonly tube: Tube } | { readonly ok: false; readonly reason: TubeRejection }

/** Collapses whitespace, trims and truncates; anything that isn't a string becomes ''. */
export function cleanText(value: unknown, max: number): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : ''
}

/** "#abc", "ABC", "#A1B2C3"… → "#aabbcc"; null when not a hex colour. */
export function parseHex(value: string): string | null {
  const hex = /^#?(?<hex>[0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value.trim())?.groups?.hex
  if (!hex) return null
  const full = hex.length === 3 ? hex.replace(/./g, (c) => c + c) : hex
  return `#${full.toLowerCase()}`
}

/** Accepted spellings → value: the enum values themselves, plus 1–3 for lightfastness. */
const LIGHTFASTNESS_BY_CODE = new Map<string, Lightfastness>([
  ...Object.values(Lightfastness).map((v) => [v, v] as const),
  ['1', Lightfastness.Excellent],
  ['2', Lightfastness.VeryGood],
  ['3', Lightfastness.NotPermanent],
])
const OPACITY_BY_CODE = new Map<string, Opacity>(Object.values(Opacity).map((v) => [v, v] as const))

function asText(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : ''
}

/** "II", "ii", "ASTM II", 2 → II. Other scales (stars, Blue Wool…) are not converted: null. */
export function toLightfastness(value: unknown): Lightfastness | null {
  const text = asText(value)
    .toUpperCase()
    .replace(/^ASTM\s*/, '')
    .trim()
  return LIGHTFASTNESS_BY_CODE.get(text) ?? null
}

export function toOpacity(value: unknown): Opacity | null {
  return OPACITY_BY_CODE.get(asText(value).toUpperCase().trim()) ?? null
}

/** Lower-case, without accents. */
export function foldText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

/** Accepts English and French wordings: "Metallic", "métallisée", "nacré", "Day-Glo", "aucun"… */
export function toSurfaceEffect(value: unknown): SurfaceEffect | null {
  const text = foldText(asText(value)).trim()
  if (/^(metal|metallic|metallique|metallise|metallisee)$/.test(text)) return SurfaceEffect.Metallic
  if (/^(iri|iridescent|iridescente|irise|irisee|pearl|pearlescent|nacre|nacree|interference)$/.test(text))
    return SurfaceEffect.Iridescent
  if (/^(fluo|fluorescent|fluorescente|neon|dayglo|day-glo)$/.test(text)) return SurfaceEffect.Fluorescent
  if (/^(none|aucun|aucune|normal|non)$/.test(text)) return SurfaceEffect.None
  return null
}

/**
 * The effect that applies to a tube: the declared one; otherwise guessed from its name or pigment code
 * (PM… metallic pigments, PW20 mica). A declared `None` wins over the guess. Null = ordinary paint.
 */
export function effectiveEffect(tube: {
  readonly name?: unknown
  readonly pigment?: unknown
  readonly effect?: unknown
}): VisibleEffect | null {
  const declared = toSurfaceEffect(tube.effect)
  if (declared === SurfaceEffect.None) return null
  if (declared) return declared

  const name = foldText(asText(tube.name))
  const pigment = asText(tube.pigment)
  if (/fluo|neon|day-?glo/.test(name)) return SurfaceEffect.Fluorescent
  // "\bnacr" so that "quinacridone" does not count.
  if (
    /irid|irise|pearl|perle|\bnacr|interfer|shimmer/.test(name) ||
    /(^|[^A-Za-z])PW20(?![0-9])/i.test(pigment)
  )
    return SurfaceEffect.Iridescent
  // "(imit)", "imitation": an ordinary colour imitating metal. "Green Gold", "Gold Ochre"…: ordinary
  // colours whose name merely evokes gold.
  const imitation = /\bimit(ation)?\b/.test(name)
  const withoutColourNames = name
    .replace(/\b(green|yellow|olive|brown|red|orange)\s+(gold|copper|bronze|silver)\b/g, ' ')
    .replace(/\b(gold|copper|bronze)\s+(yellow|ochre|orange|brown|green|red)\b/g, ' ')
  if (
    !imitation &&
    (/metal|glitter|paillet|\b(gold|silver|copper|bronze)\b/.test(withoutColourNames) ||
      /(^|[^A-Za-z])PM[0-9]/i.test(pigment))
  )
    return SurfaceEffect.Metallic
  return null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Raw tube (from a file, a form, storage) → clean Tube, or the reason it was rejected. */
export function cleanTube(raw: unknown, fileGroup = ''): CleanTubeResult {
  if (!isRecord(raw)) return { ok: false, reason: TubeRejection.NotAnObject }
  const name = cleanText(raw.name, TUBE_LIMITS.name)
  if (!name) return { ok: false, reason: TubeRejection.MissingName }
  const hex = typeof raw.hex === 'string' ? parseHex(raw.hex) : null
  if (!hex) return { ok: false, reason: TubeRejection.InvalidColour }
  const ownGroup = raw.group !== undefined && raw.group !== null && raw.group !== ''
  return {
    ok: true,
    tube: {
      name,
      pigment: cleanText(raw.pigment, TUBE_LIMITS.pigment),
      hex,
      lightfastness: toLightfastness(raw.light),
      opacity: toOpacity(raw.opac),
      effect: toSurfaceEffect(raw.effect),
      group: cleanText(ownGroup ? raw.group : fileGroup, TUBE_LIMITS.group),
    },
  }
}
