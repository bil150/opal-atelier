/**
 * What a limited palette can reach: every mix of its paints (and of white) placed on a hue/chroma
 * disc, the convex shape around them, and which hues stay out of reach.
 */
import { convexHull, polar, polygonArea, type Point } from './geometry'
import { toOklab } from './oklab'
import { mixPaints } from './paint-mix'
import type { PaintColor } from './paint-color'
import { sameHex } from './paint-color'
import { mod, type Rgb01 } from './srgb'

/** Generic titanium white added to the palette when "+ white" is on. */
export const WHITE_HEX = '#F5F4EF'
/** Radius of the reach disc and the chroma that maps to its edge. */
export const GAMUT_RADIUS = 86
const MAX_CHROMA = 0.26
/** OKLab hue that lands at the top of the disc (yellow, like the painter's wheel). */
const TOP_HUE = 110

/** Chroma above which a hue counts as clearly reached, and below which it is out of reach. */
const VIVID_CHROMA = 0.09
const MISSING_CHROMA = 0.035
export const HUE_SECTORS = 12

export interface GamutPoint {
  readonly point: Point
  readonly chroma: number
  /** Angle on the disc, 0 = top. */
  readonly angle: number
}

export function gamutPoint(c: Rgb01): GamutPoint {
  const [, A, B] = toOklab(c)
  const chroma = Math.hypot(A, B)
  const angle = mod(TOP_HUE - (Math.atan2(B, A) * 180) / Math.PI, 360)
  return { point: polar(angle, Math.min(1, chroma / MAX_CHROMA) * GAMUT_RADIUS), chroma, angle }
}

/** Colour at the reference ring of the disc for a given angle (mid chroma). */
export function ringHueOklab(angle: number): readonly [number, number, number] {
  const h = ((TOP_HUE - angle) * Math.PI) / 180
  return [0.72, 0.13 * Math.cos(h), 0.13 * Math.sin(h)]
}

/** Mix of `hexes` in proportions `weights`, with a share `white` of white on top. */
export function mixWithWhite(hexes: readonly string[], weights: readonly number[], white: number): Rgb01 {
  if (!white) return mixPaints(hexes, weights)
  return mixPaints([...hexes, WHITE_HEX], [...weights.map((v) => v * (1 - white)), white])
}

/** Every way of splitting `steps` whole parts between `n` paints. */
function* compositions(n: number, steps: number): Generator<number[]> {
  const w = new Array<number>(n).fill(0)
  function* rec(k: number, left: number): Generator<number[]> {
    if (k === n - 1) {
      w[k] = left
      yield w.slice()
      return
    }
    for (let v = 0; v <= left; v++) {
      w[k] = v
      yield* rec(k + 1, left - v)
    }
  }
  yield* rec(0, steps)
}

/** Area of the reachable shape; lighter sampling than the display (quarters, 2 doses of white). */
export function reachArea(hexes: readonly string[], withWhite: boolean): number {
  const n = hexes.length
  const steps = n > 5 ? 2 : n > 3 ? 3 : 4
  const whites = withWhite ? [0, 0.5] : [0]
  const points: Point[] = []
  for (const w of compositions(n, steps)) {
    const shares = w.map((v) => v / steps)
    for (const white of whites) points.push(gamutPoint(mixWithWhite(hexes, shares, white)).point)
  }
  return polygonArea(convexHull(points))
}

/** Among `candidates`, the paint that widens the reachable shape of `palette` the most. */
export function bestAddition(
  palette: readonly string[],
  candidates: readonly PaintColor[],
  withWhite: boolean,
): PaintColor | null {
  let best: PaintColor | null = null
  let bestArea = -1
  for (const candidate of candidates) {
    if (palette.some((hex) => sameHex(hex, candidate.hex))) continue
    const area = reachArea([...palette, candidate.hex], withWhite)
    if (area > bestArea) {
      bestArea = area
      best = candidate
    }
  }
  return best
}

export interface PaletteSample {
  readonly color: Rgb01
  readonly gamut: GamutPoint
}

export interface PaletteReach {
  /** Every sampled mix (sixths, quarters or thirds of each paint, with each dose of white). */
  readonly samples: readonly PaletteSample[]
  readonly hull: readonly Point[]
  /** Hue sectors (0 = yellow … 11 = green, see HUE_SECTORS) reached vividly. */
  readonly vivid: readonly number[]
  /** Hue sectors out of reach or very dull. */
  readonly missing: readonly number[]
}

/** Doses of white shown on the chart and on the disc. */
export function whiteDoses(withWhite: boolean): readonly number[] {
  return withWhite ? [0, 0.25, 0.5, 0.75] : [0]
}

export function paletteReach(hexes: readonly string[], withWhite: boolean): PaletteReach {
  const n = hexes.length
  const steps = n <= 4 ? 6 : n <= 6 ? 4 : 3
  const strongest = new Array<number>(HUE_SECTORS).fill(0)
  const samples: PaletteSample[] = []
  for (const w of compositions(n, steps)) {
    for (const white of whiteDoses(withWhite)) {
      const color = mixWithWhite(
        hexes,
        w.map((v) => v / steps),
        white,
      )
      const gamut = gamutPoint(color)
      samples.push({ color, gamut })
      const sector = mod(Math.round(gamut.angle / 30), HUE_SECTORS)
      if (gamut.chroma > strongest[sector]!) strongest[sector] = gamut.chroma
    }
  }
  const sectors = strongest.map((chroma, i) => ({ chroma, i }))
  return {
    samples,
    hull: convexHull(samples.map((s) => s.gamut.point)),
    vivid: sectors.filter((s) => s.chroma >= VIVID_CHROMA).map((s) => s.i),
    missing: sectors.filter((s) => s.chroma < MISSING_CHROMA).map((s) => s.i),
  }
}
