import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useZoomPan, viewTransform } from './use-zoom-pan'

function frame(width: number, height: number) {
  const el = document.createElement('div')
  Object.defineProperty(el, 'clientWidth', { value: width })
  Object.defineProperty(el, 'clientHeight', { value: height })
  return { current: el }
}

describe('useZoomPan', () => {
  it('keeps its actions stable while the view changes (effects may depend on them)', () => {
    const ref = frame(200, 100)
    const { result } = renderHook(() => useZoomPan(ref, 4))
    const { refit, zoomBy } = result.current
    act(() => result.current.zoomBy(2))
    expect(result.current.view.zoom).toBe(2)
    expect(result.current.refit).toBe(refit)
    expect(result.current.zoomBy).toBe(zoomBy)
  })

  it('does not re-render for a view that did not change', () => {
    const ref = frame(200, 100)
    const { result } = renderHook(() => useZoomPan(ref, 4))
    const before = result.current
    act(() => result.current.refit())
    act(() => result.current.reset())
    expect(result.current).toBe(before)
  })

  it('zooms around the centre, caps the zoom and pans within the image', () => {
    const ref = frame(200, 100)
    const { result } = renderHook(() => useZoomPan(ref, 4))
    act(() => result.current.zoomBy(2))
    expect(result.current.view).toEqual({ zoom: 2, tx: -100, ty: -50 })
    act(() => result.current.pan(500, 500))
    expect(result.current.view).toEqual({ zoom: 2, tx: 0, ty: 0 })
    act(() => result.current.zoomBy(10))
    expect(result.current.view.zoom).toBe(4)
    act(() => result.current.reset())
    expect(viewTransform(result.current.view)).toBeUndefined()
  })
})
