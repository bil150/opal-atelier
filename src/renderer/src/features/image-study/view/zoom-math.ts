/**
 * Zoom and pan of an image inside its frame. The image fits the frame at zoom 1; zooming scales it by a CSS
 * transform (no pixel is recomputed). Offsets are in screen pixels; the image never leaves the frame.
 */

export interface ZoomView {
  readonly zoom: number
  readonly tx: number
  readonly ty: number
}

export interface FrameSize {
  readonly width: number
  readonly height: number
}

export const FIT_VIEW: ZoomView = { zoom: 1, tx: 0, ty: 0 }

/** Brings zoom into [1, max] and the offsets back so the image covers the frame. */
export function clampView(view: ZoomView, frame: FrameSize, max: number): ZoomView {
  const zoom = Math.min(max, Math.max(1, view.zoom))
  return {
    zoom,
    tx: Math.min(0, Math.max(frame.width - frame.width * zoom, view.tx)),
    ty: Math.min(0, Math.max(frame.height - frame.height * zoom, view.ty)),
  }
}

/** New zoom keeping the frame point (fx, fy) still. */
export function zoomAt(
  view: ZoomView,
  zoom: number,
  fx: number,
  fy: number,
  frame: FrameSize,
  max: number,
): ZoomView {
  const z = Math.min(max, Math.max(1, zoom))
  const k = z / view.zoom
  return clampView({ zoom: z, tx: fx - (fx - view.tx) * k, ty: fy - (fy - view.ty) * k }, frame, max)
}

export function panBy(view: ZoomView, dx: number, dy: number, frame: FrameSize, max: number): ZoomView {
  return clampView({ ...view, tx: view.tx + dx, ty: view.ty + dy }, frame, max)
}

/**
 * Brings a point of the image (fractions u, v of its width and height) back inside the frame,
 * with a margin — used when the marker moves with the keyboard.
 */
export function reveal(
  view: ZoomView,
  u: number,
  v: number,
  frame: FrameSize,
  max: number,
  margin = 24,
): ZoomView {
  if (view.zoom === 1) return view
  let { tx, ty } = view
  const sx = u * frame.width * view.zoom + tx
  const sy = v * frame.height * view.zoom + ty
  if (sx < margin) tx += margin - sx
  else if (sx > frame.width - margin) tx -= sx - (frame.width - margin)
  if (sy < margin) ty += margin - sy
  else if (sy > frame.height - margin) ty -= sy - (frame.height - margin)
  return clampView({ zoom: view.zoom, tx, ty }, frame, max)
}

/** Centres the view on the image point (u, v); at zoom 1 it first zooms ×2 (navigation thumbnail). */
export function centreOn(view: ZoomView, u: number, v: number, frame: FrameSize, max: number): ZoomView {
  const zoom = view.zoom === 1 ? 2 : view.zoom
  return clampView(
    { zoom, tx: frame.width / 2 - u * frame.width * zoom, ty: frame.height / 2 - v * frame.height * zoom },
    frame,
    max,
  )
}

export interface PinchStart {
  readonly distance: number
  readonly zoom: number
  /** Image point (in frame pixels at zoom 1) under the fingers' midpoint. */
  readonly ux: number
  readonly uy: number
}

export interface PointerPosition {
  readonly x: number
  readonly y: number
}

/** a, b: the two fingers, relative to the frame's top-left corner. */
export function pinchStart(view: ZoomView, a: PointerPosition, b: PointerPosition): PinchStart {
  const mx = (a.x + b.x) / 2
  const my = (a.y + b.y) / 2
  return {
    distance: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
    zoom: view.zoom,
    ux: (mx - view.tx) / view.zoom,
    uy: (my - view.ty) / view.zoom,
  }
}

/** The image point between the fingers stays between them, even when the fingers move. */
export function pinchMove(
  start: PinchStart,
  a: PointerPosition,
  b: PointerPosition,
  frame: FrameSize,
  max: number,
): ZoomView {
  const zoom = Math.min(max, Math.max(1, (start.zoom * Math.hypot(a.x - b.x, a.y - b.y)) / start.distance))
  return clampView(
    { zoom, tx: (a.x + b.x) / 2 - start.ux * zoom, ty: (a.y + b.y) / 2 - start.uy * zoom },
    frame,
    max,
  )
}

/** "×1,5" style label (decimal comma or point by locale). */
export function zoomLabel(zoom: number, locale: string): string {
  return `×${(Math.round(zoom * 10) / 10).toLocaleString(locale)}`
}
