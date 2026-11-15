import { useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react'
import {
  FIT_VIEW,
  centreOn,
  clampView,
  panBy,
  pinchMove,
  pinchStart,
  reveal,
  zoomAt,
  type FrameSize,
  type PinchStart,
  type PointerPosition,
  type ZoomView,
} from './zoom-math'

export interface ZoomPan {
  readonly view: ZoomView
  readonly reset: () => void
  /** Multiplies the zoom around the frame centre (+, − buttons and keys). */
  readonly zoomBy: (factor: number) => void
  /** Wheel zoom around a frame point. */
  readonly zoomAround: (factor: number, fx: number, fy: number) => void
  readonly pan: (dx: number, dy: number) => void
  /** Brings the image point (u, v), fractions of its size, back on screen. */
  readonly reveal: (u: number, v: number) => void
  readonly centreOn: (u: number, v: number) => void
  readonly startPinch: (a: PointerPosition, b: PointerPosition) => PinchStart
  readonly movePinch: (start: PinchStart, a: PointerPosition, b: PointerPosition) => void
  /** Re-applies the bounds after the frame changed size. */
  readonly refit: () => void
}

/** Zoom (1 to max) and pan of an image inside the frame element that `frameRef` points at, by CSS transform. */
export function useZoomPan(frameRef: RefObject<HTMLElement | null>, max: number): ZoomPan {
  const [view, setView] = useState<ZoomView>(FIT_VIEW)
  const current = useRef(view)
  useLayoutEffect(() => {
    current.current = view
  })

  // The actions never change identity (effects can depend on them), and an unchanged view is not re-set.
  const actions = useMemo(() => {
    const frame = (): FrameSize => ({
      width: frameRef.current?.clientWidth ?? 1,
      height: frameRef.current?.clientHeight ?? 1,
    })
    const apply = (next: (v: ZoomView) => ZoomView) =>
      setView((v) => {
        const n = next(v)
        return sameView(n, v) ? v : n
      })
    return {
      reset: () => apply(() => FIT_VIEW),
      zoomBy: (factor: number) =>
        apply((v) => {
          const f = frame()
          return zoomAt(v, v.zoom * factor, f.width / 2, f.height / 2, f, max)
        }),
      zoomAround: (factor: number, fx: number, fy: number) =>
        apply((v) => zoomAt(v, v.zoom * factor, fx, fy, frame(), max)),
      pan: (dx: number, dy: number) => apply((v) => panBy(v, dx, dy, frame(), max)),
      reveal: (u: number, v: number) => apply((c) => reveal(c, u, v, frame(), max)),
      centreOn: (u: number, v: number) => apply((c) => centreOn(c, u, v, frame(), max)),
      startPinch: (a: PointerPosition, b: PointerPosition) => pinchStart(current.current, a, b),
      movePinch: (start: PinchStart, a: PointerPosition, b: PointerPosition) =>
        apply(() => pinchMove(start, a, b, frame(), max)),
      refit: () => apply((v) => clampView(v, frame(), max)),
    }
  }, [frameRef, max])

  return useMemo(() => ({ view, ...actions }), [view, actions])
}

function sameView(a: ZoomView, b: ZoomView): boolean {
  return a.zoom === b.zoom && a.tx === b.tx && a.ty === b.ty
}

/** CSS transform for a view (none at zoom 1). */
export function viewTransform(view: ZoomView): string | undefined {
  return view.zoom === 1 ? undefined : `translate(${view.tx}px,${view.ty}px) scale(${view.zoom})`
}
