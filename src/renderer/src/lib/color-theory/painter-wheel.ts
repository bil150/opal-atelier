/**
 * Colour wheels. The painter's wheel (RYB) uses 12 reference colours with a painted look
 * (yellow on top, primaries yellow, red, blue 120° apart), interpolated in OKLab in between.
 * The light wheel (RGB) is the plain HSV hue circle.
 */
import { fromOklab, mixOklab, toOklab, type OkLab } from './oklab'
import { hexToRgb01, hsv, mod, type Rgb01 } from './srgb'

export enum WheelMode {
  /** Painter's wheel, subtractive mixing: red, yellow, blue. */
  Painter = 'ryb',
  /** Light wheel, additive mixing: red, green, blue. */
  Light = 'rgb',
}

const RYB_REFERENCES: readonly OkLab[] = [
  '#F4E500',
  '#FDC60B',
  '#F18E1C',
  '#EA621F',
  '#E32322',
  '#C4037D',
  '#6D398B',
  '#444E99',
  '#2A71B0',
  '#0696BB',
  '#008E5B',
  '#8CBB26',
].map((h) => toOklab(hexToRgb01(h)))

/** Painter's wheel colour at `angle` degrees (0 = yellow, 120 = red, 240 = blue). */
export function painterColor(angle: number): Rgb01 {
  const a = mod(angle, 360)
  const i = Math.floor(a / 30)
  const t = (a - i * 30) / 30
  return fromOklab(mixOklab(RYB_REFERENCES[i]!, RYB_REFERENCES[(i + 1) % 12]!, t))
}

export function wheelColor(mode: WheelMode, angle: number): Rgb01 {
  return mode === WheelMode.Painter ? painterColor(angle) : hsv(mod(angle, 360), 1, 1)
}

/** Rank of each of the 12 main hues, starting from a primary. */
export enum HueRank {
  Primary = 'primary',
  Secondary = 'secondary',
  Tertiary = 'tertiary',
}

const RANK_CYCLE: readonly HueRank[] = [
  HueRank.Primary,
  HueRank.Tertiary,
  HueRank.Secondary,
  HueRank.Tertiary,
]

/** Nearest of the 12 named hues (0–11), and its rank when the angle sits exactly on it. */
export function hueSlot(angle: number): { readonly index: number; readonly rank: HueRank | null } {
  const index = mod(Math.round(angle / 30), 12)
  const exact = Math.abs(mod(angle + 15, 30) - 15) < 0.01
  return { index, rank: exact ? RANK_CYCLE[index % 4]! : null }
}

/** Primaries sit at 0°, 120°, 240°; secondaries 60° further. */
export const PRIMARY_ANGLES: readonly number[] = [0, 120, 240]
