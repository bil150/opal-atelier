import { describe, expect, it } from 'vitest'
import {
  FIT_VIEW,
  centreOn,
  clampView,
  panBy,
  pinchMove,
  pinchStart,
  reveal,
  zoomAt,
  zoomLabel,
} from './zoom-math'

const frame = { width: 400, height: 300 }
const MAX = 16

describe('zoom and pan', () => {
  it('keeps the zoom between 1 and the maximum, and the image over the frame', () => {
    expect(clampView({ zoom: 0.5, tx: 50, ty: 50 }, frame, MAX)).toEqual(FIT_VIEW)
    expect(clampView({ zoom: 40, tx: -1e6, ty: 10 }, frame, MAX)).toEqual({ zoom: 16, tx: -6000, ty: 0 })
  })

  it('zooms around a fixed point', () => {
    const v = zoomAt(FIT_VIEW, 2, 100, 50, frame, MAX)
    expect(v).toEqual({ zoom: 2, tx: -100, ty: -50 })
    // the frame point (100, 50) still shows the same image point
    expect((100 - v.tx) / v.zoom).toBe(100)
  })

  it('pans within bounds', () => {
    const zoomed = { zoom: 2, tx: -100, ty: -50 }
    expect(panBy(zoomed, 500, 500, frame, MAX)).toEqual({ zoom: 2, tx: 0, ty: 0 })
    expect(panBy(FIT_VIEW, -30, -30, frame, MAX)).toEqual(FIT_VIEW)
  })

  it('reveals a point moved off screen', () => {
    const zoomed = { zoom: 4, tx: 0, ty: 0 }
    const v = reveal(zoomed, 0.5, 0.5, frame, MAX)
    expect(0.5 * frame.width * 4 + v.tx).toBe(frame.width - 24)
    expect(reveal(FIT_VIEW, 0.9, 0.9, frame, MAX)).toBe(FIT_VIEW)
  })

  it('centres on a thumbnail point, zooming ×2 first', () => {
    expect(centreOn(FIT_VIEW, 0.5, 0.5, frame, MAX)).toEqual({ zoom: 2, tx: -200, ty: -150 })
  })

  it('keeps the image point between two fingers while pinching', () => {
    const start = pinchStart(FIT_VIEW, { x: 100, y: 100 }, { x: 200, y: 100 })
    const v = pinchMove(start, { x: 50, y: 100 }, { x: 250, y: 100 }, frame, MAX)
    expect(v.zoom).toBe(2)
    expect((150 - v.tx) / v.zoom).toBe(start.ux)
  })

  it('labels the zoom in the reader’s language', () => {
    expect(zoomLabel(1.5, 'fr')).toBe('×1,5')
    expect(zoomLabel(2.25, 'en')).toBe('×2.3')
  })
})
