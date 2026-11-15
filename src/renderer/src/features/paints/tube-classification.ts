/**
 * Tubes left out of the calculations by default:
 * - blacks: a black is mixed from colours (chromatic black), as in the studio;
 * - metallic, iridescent and fluorescent paints: one colour on screen can't represent them.
 * They stay in the list, simply excluded from recipes and advice.
 */
import { rgbToLab } from '@renderer/lib/paint-mixer'
import { effectiveEffect, foldText, type Tube } from '@renderer/lib/swatch-chart'

export interface CalculationOptions {
  /** No black tubes: chromatic blacks only. */
  readonly excludeBlacks: boolean
  /** No metallic, iridescent or fluorescent tubes. */
  readonly excludeEffects: boolean
}

export const DEFAULT_CALCULATION_OPTIONS: CalculationOptions = { excludeBlacks: true, excludeEffects: true }

const BLACK_WORDS = /(^|[^a-z])(black|noir|nero|negro|schwarz|zwart|preto)([^a-z]|$)/
const cache = new Map<string, boolean>()

function hexToRgb(hex: string) {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  }
}

/**
 * A black tube: its name says so (black, noir…), or its pigment is only blacks (PBk), or its colour is very
 * dark and hueless. A black pigment mixed with others (umber, Payne's grey…) is not enough. A metallic made
 * with a black pigment (graphite, tin, silver) is a metallic first: only its name can make it a black.
 */
export function isBlackTube(t: Pick<Tube, 'name' | 'pigment' | 'hex' | 'effect'>): boolean {
  const key = `${t.name}|${t.hex}|${t.pigment}|${t.effect ?? ''}`
  const cached = cache.get(key)
  if (cached !== undefined) return cached
  const name = foldText(t.name)
  const codes = t.pigment.split(/[/,+\s]+/).filter(Boolean)
  const effect = effectiveEffect(t) !== null
  let black =
    BLACK_WORDS.test(name) || (!effect && codes.length > 0 && codes.every((c) => /^PBk\d*$/i.test(c)))
  if (!black && !effect) {
    const [l, a, b] = rgbToLab(hexToRgb(t.hex))
    black = l <= 25 && Math.hypot(a, b) <= 8 // very dark and hueless
  }
  cache.set(key, black)
  return black
}

export enum Exclusion {
  Black = 'black',
  Effect = 'effect',
}

/** Why a tube is left out of the calculations with these options, or null if it is used. */
export function exclusionOf(t: Tube, options: CalculationOptions): Exclusion | null {
  if (options.excludeBlacks && isBlackTube(t)) return Exclusion.Black
  if (options.excludeEffects && effectiveEffect(t) !== null) return Exclusion.Effect
  return null
}
