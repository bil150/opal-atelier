/** Sections and remembered settings of the Mannequin. */
import { field, isBoolean, isOneOf } from '@renderer/hooks/use-local-storage'

export enum MannequinSection {
  Poses = 'poses',
  Sketch = 'sketch',
  Light = 'light',
}

export function isMannequinSection(value: unknown): value is MannequinSection {
  return (Object.values(MannequinSection) as unknown[]).includes(value)
}

/** Continuous modelling, or values grouped in 3 or 2 tones to study light and shade. */
export enum Shading {
  Smooth = 'smooth',
  ThreeTones = '3',
  TwoTones = '2',
}

export enum Material {
  Grey = 'grey',
  Wood = 'wood',
}

export enum BodyShape {
  Male = 'male',
  Female = 'female',
}

export const DURATIONS = [30, 60, 120, 300] as const
export type Duration = (typeof DURATIONS)[number]

export interface MannequinSettings {
  /** Height of the figure in heads, 6 to 9. */
  readonly heads: number
  /** Light direction around the figure (0 = from the front) and height, in degrees. */
  readonly lightAzimuth: number
  readonly lightElevation: number
  readonly shading: Shading
  readonly shadow: boolean
  readonly floorGrid: boolean
  readonly material: Material
  readonly shape: BodyShape
  /** Seconds per pose in a timed sketch. */
  readonly duration: Duration
  /** A new pose when the time is up. */
  readonly session: boolean
}

export const DEFAULT_SETTINGS: MannequinSettings = {
  heads: 7.5,
  lightAzimuth: 300,
  lightElevation: 40,
  shading: Shading.Smooth,
  shadow: true,
  floorGrid: true,
  material: Material.Wood,
  shape: BodyShape.Male,
  duration: 60,
  session: true,
}

export const HEADS = { min: 6, max: 9, step: 0.5 } as const
export const LIGHT_ELEVATION = { min: 5, max: 85 } as const

export const SETTINGS_KEY = 'mannequin:settings'
export const POSE_KEY = 'mannequin:pose'

const number = (raw: unknown, key: string, min: number, max: number, fallback: number, step = 0): number => {
  const v = field(raw, key, (x): x is number => typeof x === 'number' && Number.isFinite(x), fallback)
  const c = Math.min(max, Math.max(min, v))
  return step ? Math.round(c / step) * step : c
}

export function sanitizeSettings(raw: unknown): MannequinSettings {
  const d = DEFAULT_SETTINGS
  return {
    heads: number(raw, 'heads', HEADS.min, HEADS.max, d.heads, HEADS.step),
    lightAzimuth: number(raw, 'lightAzimuth', 0, 360, d.lightAzimuth),
    lightElevation: number(raw, 'lightElevation', LIGHT_ELEVATION.min, LIGHT_ELEVATION.max, d.lightElevation),
    shading: field(raw, 'shading', isOneOf(Object.values(Shading)), d.shading),
    shadow: field(raw, 'shadow', isBoolean, d.shadow),
    floorGrid: field(raw, 'floorGrid', isBoolean, d.floorGrid),
    material: field(raw, 'material', isOneOf(Object.values(Material)), d.material),
    shape: field(raw, 'shape', isOneOf(Object.values(BodyShape)), d.shape),
    duration: field(raw, 'duration', isOneOf(DURATIONS), d.duration),
    session: field(raw, 'session', isBoolean, d.session),
  }
}

export enum ViewPreset {
  Front = 'front',
  ThreeQuarter = 'three-quarter',
  Profile = 'profile',
  Back = 'back',
  Above = 'above',
}

/** Camera [around, height] in degrees. */
export const VIEW_ANGLES: Readonly<Record<ViewPreset, readonly [number, number]>> = {
  [ViewPreset.Front]: [0, 6],
  [ViewPreset.ThreeQuarter]: [35, 10],
  [ViewPreset.Profile]: [90, 6],
  [ViewPreset.Back]: [180, 6],
  [ViewPreset.Above]: [25, 55],
}

export enum LightPreset {
  Left = 'left',
  Right = 'right',
  Front = 'front',
  Back = 'back',
  Above = 'above',
  Raking = 'raking',
}

/** Light [direction, height] in degrees. */
export const LIGHT_ANGLES: Readonly<Record<LightPreset, readonly [number, number]>> = {
  [LightPreset.Left]: [300, 40],
  [LightPreset.Right]: [60, 40],
  [LightPreset.Front]: [0, 30],
  [LightPreset.Back]: [180, 35],
  [LightPreset.Above]: [30, 80],
  [LightPreset.Raking]: [90, 8],
}
