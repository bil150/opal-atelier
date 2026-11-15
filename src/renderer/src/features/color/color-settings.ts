/** Settings of the Colour tool, remembered on the device, and their validation. */
import { PaintSource, isPaintSource, DEFAULT_GENERIC_IDS } from '@renderer/features/paints/paint-options'
import { field, isBoolean, isFiniteNumber, isOneOf, readStored } from '@renderer/hooks/use-local-storage'
import { Harmony, TemperatureAction, WheelMode, mod } from '@renderer/lib/color-theory'

/** Sections reachable by URL (/color/:section). "palette" opens the simulator in whole-palette mode. */
export enum ColorSection {
  Wheel = 'wheel',
  Mix = 'mix',
  Palette = 'palette',
  Temperature = 'temperature',
  Theory = 'theory',
}

export enum ColorTab {
  Wheel = 'wheel',
  Mix = 'mix',
  Temperature = 'temperature',
  Theory = 'theory',
}

export function isColorSection(value: unknown): value is ColorSection {
  return (Object.values(ColorSection) as unknown[]).includes(value)
}

export enum WheelStyle {
  Ring = 'ring',
  /** Primaries in the centre. */
  Centre = 'centre',
  /** Overlapping discs (additive or subtractive mixing). */
  Discs = 'discs',
}

/** Number of sectors; 0 = continuous. */
export const SEGMENT_COUNTS = [12, 24, 0] as const
export type SegmentCount = (typeof SEGMENT_COUNTS)[number]

export const SATURATIONS = [1, 0.75, 0.5, 0.25] as const

export interface WheelSettings {
  readonly harmony: Harmony
  readonly mode: WheelMode
  readonly style: WheelStyle
  readonly saturation: number
  readonly segments: SegmentCount
  readonly grey: boolean
  /** Angle of the starting colour, degrees. */
  readonly base: number
}

export function sanitizeWheel(raw: unknown): WheelSettings {
  return {
    harmony: field(raw, 'harmony', isOneOf(Object.values(Harmony)), Harmony.Complementary),
    mode: field(raw, 'mode', isOneOf(Object.values(WheelMode)), WheelMode.Painter),
    style: field(raw, 'style', isOneOf(Object.values(WheelStyle)), WheelStyle.Centre),
    saturation: field(raw, 'saturation', isOneOf<number>(SATURATIONS), 1),
    segments: field(raw, 'segments', isOneOf<SegmentCount>(SEGMENT_COUNTS), 12),
    grey: field(raw, 'grey', isBoolean, false),
    base: mod(field(raw, 'base', isFiniteNumber, 0), 360),
  }
}

export enum MixMode {
  /** Dose one precise mix of 2 or 3 colours. */
  Single = 'single',
  /** Everything a limited palette of 2 to 8 colours can reach. */
  Palette = 'palette',
}

export const MAX_PARTS = 99
export const PALETTE_MIN = 2
export const PALETTE_MAX = 8

export interface MixSettings {
  /** Shared with the temperature tab. */
  readonly source: PaintSource
  readonly mode: MixMode
  readonly count: 2 | 3
  /** Paint id of each of the 3 mix slots. */
  readonly slots: readonly string[]
  readonly parts: readonly number[]
  readonly paletteSize: number
  readonly white: boolean
  /** Paint id of each of the 8 palette slots. */
  readonly paletteSlots: readonly string[]
}

const isPartCount = (v: unknown): v is number =>
  Number.isInteger(v) && (v as number) >= 0 && (v as number) <= MAX_PARTS
const isPaletteSize = (v: unknown): v is number =>
  Number.isInteger(v) && (v as number) >= PALETTE_MIN && (v as number) <= PALETTE_MAX
const isId = (v: unknown): v is string => typeof v === 'string' && v !== ''

function ids(raw: unknown, name: string, length: number): string[] {
  const list = field(raw, name, Array.isArray, [] as unknown[]) as unknown[]
  return Array.from({ length }, (_, i) => (isId(list[i]) ? list[i] : (DEFAULT_GENERIC_IDS[i] ?? '')))
}

export function sanitizeMix(raw: unknown): MixSettings {
  const parts = field(raw, 'parts', Array.isArray, [] as unknown[]) as unknown[]
  return {
    source: field(raw, 'source', isPaintSource, PaintSource.Generic),
    mode: field(raw, 'mode', isOneOf(Object.values(MixMode)), MixMode.Single),
    count: field(raw, 'count', isOneOf<2 | 3>([2, 3]), 3),
    slots: ids(raw, 'slots', 3),
    parts: [0, 1, 2].map((i) => (isPartCount(parts[i]) ? parts[i] : 1)),
    paletteSize: field(raw, 'paletteSize', isPaletteSize, 3),
    white: field(raw, 'white', isBoolean, true),
    paletteSlots: ids(raw, 'paletteSlots', PALETTE_MAX),
  }
}

export const MIX_SETTINGS_KEY = 'color:mix'

/** Simulator mode used last, so the tab reopens where the user left it. */
export function lastMixMode(): MixMode {
  const isObject = (value: unknown): value is object | null => typeof value === 'object'
  return sanitizeMix(readStored(MIX_SETTINGS_KEY, null, isObject)).mode
}

export const DOSE_COUNT = 5
export const DEFAULT_TEMPERATURE_PAINT = 'cadmium-red-light'

export interface TemperatureSettings {
  readonly paintId: string
  readonly action: TemperatureAction
  /** 0 ("a little") … 4 ("a lot"). */
  readonly dose: number
}

export function sanitizeTemperature(raw: unknown): TemperatureSettings {
  return {
    paintId: field(raw, 'paintId', isId, DEFAULT_TEMPERATURE_PAINT),
    action: field(raw, 'action', isOneOf(Object.values(TemperatureAction)), TemperatureAction.Warm),
    dose: field(raw, 'dose', isOneOf([0, 1, 2, 3, 4]), 1),
  }
}

/** Ready-made palettes of generic colours (white is added with "+ white"). */
export enum PalettePreset {
  Cmy = 'cmy',
  Ryb = 'ryb',
  Earths = 'earths',
}

export const PALETTE_PRESETS: Readonly<Record<PalettePreset, readonly string[]>> = {
  [PalettePreset.Cmy]: ['primary-cyan', 'primary-magenta', 'primary-yellow'],
  [PalettePreset.Ryb]: ['primary-yellow', 'primary-red', 'primary-blue'],
  [PalettePreset.Earths]: ['yellow-ochre', 'burnt-sienna', 'ultramarine-blue'],
}
