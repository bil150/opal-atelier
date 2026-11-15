import { mod } from './srgb'

/** Colour schemes on the wheel. */
export enum Harmony {
  Complementary = 'comp',
  /** One neighbour of the complementary. */
  NearComplementary = 'fausse',
  /** Both neighbours of the complementary (split complementary). */
  SplitComplementary = 'split',
  Triad = 'triade',
  Analogous = 'analogue',
  Square = 'carre',
  Rectangle = 'rect',
}

/** Angles of each colour relative to the base colour (the one at offset 0). */
export const HARMONY_OFFSETS: Readonly<Record<Harmony, readonly number[]>> = {
  [Harmony.Complementary]: [0, 180],
  [Harmony.NearComplementary]: [0, 150],
  [Harmony.SplitComplementary]: [0, 150, 210],
  [Harmony.Triad]: [0, 120, 240],
  [Harmony.Analogous]: [-30, 0, 30],
  [Harmony.Square]: [0, 90, 180, 270],
  [Harmony.Rectangle]: [0, 60, 180, 240],
}

export function harmonyAngles(harmony: Harmony, base: number): number[] {
  return HARMONY_OFFSETS[harmony].map((offset) => mod(base + offset, 360))
}

/**
 * Which offset of the harmony a pointer at `angle` grabs: the closest marker within 20°,
 * otherwise the base colour (offset 0) jumps to the pointer.
 */
export function grabbedOffset(harmony: Harmony, base: number, angle: number): number {
  const offsets = HARMONY_OFFSETS[harmony]
  let best = 0
  let bestDistance = Infinity
  offsets.forEach((offset, i) => {
    const d = Math.abs(mod(angle - (base + offset) + 180, 360) - 180)
    if (d < bestDistance) {
      bestDistance = d
      best = i
    }
  })
  return bestDistance < 20 ? offsets[best]! : 0
}
