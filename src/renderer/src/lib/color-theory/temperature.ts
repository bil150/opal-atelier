/**
 * Colour temperature in OKLab: where a hue points between orange (warmest, 55°) and blue (coolest, 235°).
 * Warming = adding the neighbouring paint on the orange side; cooling = on the blue side;
 * greying = a little of the complementary. Indicative only.
 */
import { hueDifference, toOklch } from './oklab'
import { mixPaints } from './paint-mix'
import { sameHex, type PaintColor } from './paint-color'
import { hexToRgb01, type Rgb01 } from './srgb'

export const WARMEST_HUE = 55
export const COOLEST_HUE = 235

/** Below this OKLab chroma a colour is treated as neutral (no hue to speak of). */
const NEUTRAL_CHROMA = 0.03

export enum TemperatureAction {
  Warm = 'warm',
  Cool = 'cool',
  Grey = 'grey',
}

export enum Temperature {
  Warm = 'warm',
  Cool = 'cool',
  Intermediate = 'intermediate',
  Neutral = 'neutral',
}

/** −1 (coolest) … 1 (warmest); 0 for greys. Weaker for dull colours. */
export function warmth(c: Rgb01): number {
  const { c: chroma, h } = toOklch(c)
  if (chroma < NEUTRAL_CHROMA) return 0
  return Math.cos((hueDifference(h, WARMEST_HUE) * Math.PI) / 180) * Math.min(1, chroma / 0.08)
}

export function temperatureOf(c: Rgb01): Temperature {
  const { c: chroma, h } = toOklch(c)
  if (chroma < NEUTRAL_CHROMA) return Temperature.Neutral
  const w = Math.cos((hueDifference(h, WARMEST_HUE) * Math.PI) / 180)
  return w > 0.3 ? Temperature.Warm : w < -0.3 ? Temperature.Cool : Temperature.Intermediate
}

/**
 * The neighbouring paint in the direction of `targetHue` (warm or cool side), close in hue and vivid enough;
 * null when the base already sits there or is neutral.
 */
export function neighbourTowards<T extends PaintColor>(
  base: T,
  targetHue: number,
  candidates: readonly T[],
): T | null {
  const b = toOklch(hexToRgb01(base.hex))
  const way = hueDifference(b.h, targetHue)
  if (Math.abs(way) < 15 || b.c < NEUTRAL_CHROMA) return null
  let best: T | null = null
  let bestScore = Infinity
  for (const t of candidates) {
    if (sameHex(t.hex, base.hex)) continue
    const l = toOklch(hexToRgb01(t.hex))
    if (l.c < 0.05) continue
    const d = hueDifference(b.h, l.h)
    if (Math.sign(d) !== Math.sign(way) || Math.abs(d) < 10 || Math.abs(d) > Math.abs(way) + 40) continue
    const score = Math.abs(d) - 60 * l.c // close in hue, and vivid enough
    if (score < bestScore) {
      bestScore = score
      best = t
    }
  }
  return best
}

/** The paint most opposite in hue, vivid enough to grey quickly; null if none is really opposite. */
export function complementOf<T extends PaintColor>(base: T, candidates: readonly T[]): T | null {
  const b = toOklch(hexToRgb01(base.hex))
  if (b.c < NEUTRAL_CHROMA) return null
  let best: T | null = null
  let bestScore = Infinity
  for (const t of candidates) {
    const l = toOklch(hexToRgb01(t.hex))
    if (l.c < 0.04) continue
    const score = Math.abs(180 - Math.abs(hueDifference(b.h, l.h))) - 40 * l.c
    if (score < bestScore) {
      bestScore = score
      best = t
    }
  }
  return best && Math.abs(hueDifference(b.h, toOklch(hexToRgb01(best.hex)).h)) > 120 ? best : null
}

/** Shares of added paint offered from "a little" to "a lot" when warming or cooling. */
export const ADDITION_DOSES: readonly number[] = [0.08, 0.14, 0.22, 0.33, 0.5]

/** Doses for greying: fifths of the way to the most neutral mix with the complementary. */
export function greyingDoses(baseHex: string, complementHex: string): number[] {
  let mostNeutral = 0.5
  let lowestChroma = Infinity
  for (let f = 0.02; f <= 0.7; f += 0.02) {
    const chroma = toOklch(mixPaints([baseHex, complementHex], [1 - f, f])).c
    if (chroma < lowestChroma) {
      lowestChroma = chroma
      mostNeutral = f
    }
  }
  return [0.2, 0.4, 0.6, 0.8, 1].map((k) => mostNeutral * k)
}

/** Why no paint can be added. */
export enum NoAgentReason {
  AlreadyWarmest = 'already-warmest',
  AlreadyCoolest = 'already-coolest',
  AlreadyNeutral = 'already-neutral',
  NoComplement = 'no-complement',
}

export type AgentChoice<T> = { readonly agent: T } | { readonly agent: null; readonly reason: NoAgentReason }

export function chooseAgent<T extends PaintColor>(
  action: TemperatureAction,
  base: T,
  candidates: readonly T[],
): AgentChoice<T> {
  switch (action) {
    case TemperatureAction.Warm: {
      const agent = neighbourTowards(base, WARMEST_HUE, candidates)
      return agent ? { agent } : { agent: null, reason: NoAgentReason.AlreadyWarmest }
    }
    case TemperatureAction.Cool: {
      const agent = neighbourTowards(base, COOLEST_HUE, candidates)
      return agent ? { agent } : { agent: null, reason: NoAgentReason.AlreadyCoolest }
    }
    case TemperatureAction.Grey: {
      const agent = complementOf(base, candidates)
      if (agent) return { agent }
      const neutral = toOklch(hexToRgb01(base.hex)).c < NEUTRAL_CHROMA
      return { agent: null, reason: neutral ? NoAgentReason.AlreadyNeutral : NoAgentReason.NoComplement }
    }
  }
}
