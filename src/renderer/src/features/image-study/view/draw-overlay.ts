/**
 * What is drawn over the image: the grid (lines, cell names, selected cells) and the picker's sight.
 * `scale` = image pixels per screen pixel, so lines keep a constant width on screen whatever the zoom.
 */
import { cellName, type CellKey, sortedCells } from '../grid/cell-refs'
import { LineStyle, cellRect, gridGeometry, type GridSettings } from '../grid/grid-settings'

/** The parts of the 2D context the overlay uses (a fake can stand in for tests). */
export type DrawingContext = Pick<
  CanvasRenderingContext2D,
  | 'save'
  | 'restore'
  | 'beginPath'
  | 'moveTo'
  | 'lineTo'
  | 'arc'
  | 'stroke'
  | 'strokeRect'
  | 'fillText'
  | 'setLineDash'
  | 'lineCap'
  | 'lineWidth'
  | 'strokeStyle'
  | 'fillStyle'
  | 'font'
  | 'textBaseline'
>

export interface GridOverlay {
  readonly grid: GridSettings
  readonly selection: ReadonlySet<CellKey>
  /** False when exporting: the saved image shows no selection. */
  readonly showSelection: boolean
}

/** Cell names are drawn only when cells are at least this big on screen. */
const MIN_CELL_FOR_LETTERS = 28

export function drawGrid(
  ctx: DrawingContext,
  width: number,
  height: number,
  scale: number,
  overlay: GridOverlay,
  /** Size of one output pixel in drawing units: 1 at image resolution, less when drawn at screen resolution. */
  pixel = 1,
): void {
  const { grid } = overlay
  // Whole output pixels, at least one: a thinner line, or one straddling two pixels, would be smoothed into a
  // half-transparent blur. Odd widths sit on pixel centres so they cover whole pixels: always crisp and opaque.
  const outputWidth = Math.max(1, Math.round((grid.width * scale) / pixel))
  const lineWidth = outputWidth * pixel
  const offset = outputWidth % 2 ? pixel / 2 : 0
  const snap = (v: number) => Math.round(v / pixel) * pixel
  let dash: number[] = []
  let cap: CanvasLineCap = 'butt'
  if (grid.lineStyle === LineStyle.Dashed)
    dash = [Math.max(lineWidth * 4, 6 * scale), Math.max(lineWidth * 3, 4 * scale)]
  else if (grid.lineStyle === LineStyle.Dotted) {
    dash = [0.01, Math.max(lineWidth * 2.2, 4 * scale)]
    cap = 'round'
  }

  const g = gridGeometry(grid, width, height)
  ctx.save()
  ctx.lineCap = cap
  ctx.setLineDash(dash)
  ctx.strokeStyle = grid.color
  ctx.lineWidth = lineWidth
  ctx.beginPath()
  for (let i = 0; i <= g.cols; i++) {
    const p = snap(g.fx + g.cell * i)
    if (p > 0.5 && p < width - 0.5) {
      ctx.moveTo(p + offset, 0)
      ctx.lineTo(p + offset, height)
    }
  }
  for (let i = 0; i <= g.rows; i++) {
    const p = snap(g.fy + g.cell * i)
    if (p > 0.5 && p < height - 0.5) {
      ctx.moveTo(0, p + offset)
      ctx.lineTo(width, p + offset)
    }
  }
  ctx.stroke()
  ctx.restore()

  // Cell names in each cell's top-left corner, in the grid colour.
  if (grid.letters && g.cell / scale >= MIN_CELL_FOR_LETTERS) {
    const size = Math.max(11 * scale, Math.min(g.cell * 0.2, 26 * scale))
    const pad = 4 * scale + lineWidth / 2
    ctx.save()
    ctx.font = `700 ${size}px system-ui, -apple-system, "Segoe UI", sans-serif`
    ctx.textBaseline = 'top'
    ctx.fillStyle = grid.color
    for (let r = 0; r < g.rows; r++) {
      for (let c = 0; c < g.cols; c++) {
        // A cell cut by the edge gets no name if there is no room for it (it would spill onto its neighbour).
        const rc = cellRect(g, c, r, width, height)
        if (rc.h < size + 2 * pad || rc.w < size * 1.8 + 2 * pad) continue
        ctx.fillText(cellName(c, r), rc.x0 + pad, rc.y0 + pad)
      }
    }
    ctx.restore()
  }

  // Selected cells: a thick frame inside (no veil, so the image's colours stay untouched).
  if (overlay.showSelection && overlay.selection.size) {
    const sw = Math.max(3 * scale, lineWidth * 2.5)
    ctx.save()
    ctx.strokeStyle = grid.color
    ctx.lineWidth = sw
    ctx.setLineDash([])
    for (const [c, r] of sortedCells(overlay.selection)) {
      const rc = cellRect(g, c, r, width, height)
      ctx.strokeRect(rc.x0 + sw / 2, rc.y0 + sw / 2, Math.max(1, rc.w - sw), Math.max(1, rc.h - sw))
    }
    ctx.restore()
  }
}

/** Crosshair sight: circle and arms, with a gap in the middle to see the targeted pixel. */
export function drawSight(ctx: DrawingContext, x: number, y: number, scale: number): void {
  const cx = x + 0.5
  const cy = y + 0.5
  const r = 14 * scale
  const gap = 4 * scale
  const arm = r + 6 * scale
  ctx.save()
  for (const [color, w] of [
    ['rgba(255,255,255,.9)', 3.5 * scale],
    ['rgba(0,0,0,.9)', 1.25 * scale],
  ] as const) {
    ctx.strokeStyle = color
    ctx.lineWidth = w
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.moveTo(cx - arm, cy)
    ctx.lineTo(cx - gap, cy)
    ctx.moveTo(cx + gap, cy)
    ctx.lineTo(cx + arm, cy)
    ctx.moveTo(cx, cy - arm)
    ctx.lineTo(cx, cy - gap)
    ctx.moveTo(cx, cy + gap)
    ctx.lineTo(cx, cy + arm)
    ctx.stroke()
  }
  ctx.restore()
}
