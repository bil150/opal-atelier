/**
 * The drawing grid: always square cells. The number of columns gives the cell size, which can then be
 * fine-tuned (`cell`: side as a fraction of the image width) and shifted (`ox`, `oy`: position of a grid
 * crossing, as a fraction of the width). Fractions hold for any resolution; rows follow the height.
 */
import { field, isBoolean, isOneOf } from '@renderer/hooks/use-local-storage'
import { parseHex } from '@renderer/lib/swatch-chart'

export enum LineStyle {
  Solid = 'solid',
  Dashed = 'dash',
  Dotted = 'dot',
}

export interface GridSettings {
  readonly cols: number
  /** Cell side, fraction of the image width. */
  readonly cell: number
  readonly ox: number
  readonly oy: number
  /** Lower-case #rrggbb. */
  readonly color: string
  /** Line width in screen pixels. */
  readonly width: number
  readonly lineStyle: LineStyle
  /** Cell names (A1, B1…) in each cell's top-left corner. */
  readonly letters: boolean
}

/** Default line colour: a mid grey, rgb(135, 135, 135), visible on light and dark images alike. */
export const DEFAULT_LINE_COLOUR = '#878787'

/** Line width, in screen pixels: the minimum gives the finest line there is (one pixel of the image). */
export const MIN_LINE_WIDTH = 0.01
export const MAX_LINE_WIDTH = 8

export const MAX_COLUMNS = 100
/** Typing in the columns field takes effect live only within this range. */
export const MAX_TYPED_COLUMNS = 40

const DEFAULTS: GridSettings = {
  cols: 4,
  cell: 0.25,
  ox: 0,
  oy: 0,
  color: DEFAULT_LINE_COLOUR,
  width: 1,
  lineStyle: LineStyle.Solid,
  letters: false,
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const v = typeof value === 'number' ? value : parseFloat(String(value))
  return Number.isNaN(v) ? fallback : Math.min(max, Math.max(min, v))
}

function clampInteger(value: unknown, min: number, max: number, fallback: number): number {
  const v = typeof value === 'number' ? Math.trunc(value) : parseInt(String(value), 10)
  return Number.isNaN(v) ? fallback : Math.min(max, Math.max(min, v))
}

/** Stored or imported grid → valid settings. Reads both this app's fields and the original site's (dash). */
export function sanitizeGrid(raw: unknown): GridSettings {
  const g = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>
  const cols = clampInteger(g.cols, 1, MAX_COLUMNS, DEFAULTS.cols)
  const color = typeof g.color === 'string' ? parseHex(g.color) : null
  const legacyWidth = g.v !== 2 && g.width === 1.5 // 1.5 px was the original default; it became 1 px
  return {
    cols,
    cell: clampNumber(g.cell, 1 / MAX_COLUMNS, 1, 1 / cols),
    ox: clampNumber(g.ox, -1, 1, 0),
    oy: clampNumber(g.oy, -1, 10, 0),
    color: color ?? DEFAULTS.color,
    width: legacyWidth
      ? DEFAULTS.width
      : Math.round(clampNumber(g.width, MIN_LINE_WIDTH, MAX_LINE_WIDTH, DEFAULTS.width) * 100) / 100,
    lineStyle: field(
      g,
      'lineStyle',
      isOneOf(Object.values(LineStyle)),
      field(g, 'dash', isOneOf(Object.values(LineStyle)), DEFAULTS.lineStyle),
    ),
    letters: field(g, 'letters', isBoolean, false),
  }
}

/** Offset brought between 0 and one cell (a grid shifted by a whole cell is the same grid). */
export function normaliseOffset(offset: number, cell: number): number {
  return ((offset % cell) + cell) % cell
}

/** Has the grid been fine-tuned (non-whole column count, or shifted)? Then there is something to reset. */
export function isGridAdjusted(g: GridSettings): boolean {
  const n = 1 / g.cell
  const eps = 1e-6
  const shifted = (o: number) => {
    const off = normaliseOffset(o, g.cell)
    return off > eps && g.cell - off > eps
  }
  return Math.abs(n - Math.round(n)) > 0.005 || shifted(g.ox) || shifted(g.oy)
}

/** Sets the number of columns (decimals allowed); this snaps the grid back to the corner. */
export function withColumns(g: GridSettings, columns: number): GridSettings {
  const n = clampNumber(columns, 1, MAX_COLUMNS, 1 / g.cell)
  return { ...g, cols: Math.max(1, Math.min(MAX_COLUMNS, Math.round(n))), cell: 1 / n, ox: 0, oy: 0 }
}

/** − and + buttons: from a decimal value they first go to the neighbouring whole number. */
export function stepColumns(g: GridSettings, direction: 1 | -1): GridSettings {
  const current = 1 / g.cell
  const whole = Math.abs(current - Math.round(current)) < 0.005
  return withColumns(
    g,
    whole ? Math.round(current) + direction : direction > 0 ? Math.ceil(current) : Math.floor(current),
  )
}

export enum FineAdjustment {
  Size = 'size',
  X = 'x',
  Y = 'y',
}

/**
 * Fine tuning in pixels of the original image: the cell by half pixels (around the reference crossing,
 * which stays put), the offset by whole pixels.
 */
export function fineTune(
  g: GridSettings,
  what: FineAdjustment,
  steps: number,
  originalWidth: number,
): GridSettings {
  const px = 1 / originalWidth
  let { cell, ox, oy } = g
  if (what === FineAdjustment.Size)
    cell = clampNumber(cell + steps * 0.5 * px, Math.max(1 / MAX_COLUMNS, 4 * px), 1, cell)
  else if (what === FineAdjustment.X) ox += steps * px
  else oy += steps * px
  return { ...g, cell, ox: normaliseOffset(ox, cell), oy: normaliseOffset(oy, cell) }
}

/** Grid in the image, in image pixels. The first cell may start before the edge (negative fx/fy). */
export interface GridGeometry {
  readonly cell: number
  readonly fx: number
  readonly fy: number
  readonly cols: number
  readonly rows: number
}

export function gridGeometry(g: GridSettings, width: number, height: number): GridGeometry {
  const cell = g.cell * width
  let fx = normaliseOffset(g.ox, g.cell) * width
  let fy = normaliseOffset(g.oy, g.cell) * width
  if (fx > 0.5) fx -= cell // the first cell starts before the edge: it is cut
  if (fy > 0.5) fy -= cell
  return {
    cell,
    fx,
    fy,
    cols: Math.max(1, Math.ceil((width - fx - 0.5) / cell)),
    rows: Math.max(1, Math.ceil((height - fy - 0.5) / cell)),
  }
}

export interface CellRect {
  readonly x0: number
  readonly y0: number
  readonly w: number
  readonly h: number
}

/** Pixel rectangle of cell (c, r), clipped to the image. */
export function cellRect(
  geometry: GridGeometry,
  c: number,
  r: number,
  width: number,
  height: number,
): CellRect {
  const { cell, fx, fy } = geometry
  const x0 = Math.max(0, Math.round(fx + cell * c))
  const x1 = Math.min(width, Math.round(fx + cell * (c + 1)))
  const y0 = Math.max(0, Math.round(fy + cell * r))
  const y1 = Math.min(height, Math.round(fy + cell * (r + 1)))
  return { x0, y0, w: Math.max(1, x1 - x0), h: Math.max(1, y1 - y0) }
}

/** Cell under an image point, or null outside the grid. */
export function cellAt(geometry: GridGeometry, x: number, y: number): readonly [number, number] | null {
  const c = Math.floor((x + 0.5 - geometry.fx) / geometry.cell)
  const r = Math.floor((y + 0.5 - geometry.fy) / geometry.cell)
  return c < 0 || r < 0 || c >= geometry.cols || r >= geometry.rows ? null : [c, r]
}
