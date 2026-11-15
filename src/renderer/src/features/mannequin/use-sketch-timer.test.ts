import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSketchTimer } from './use-sketch-timer'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

const advance = async (ms: number) => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

describe('useSketchTimer', () => {
  it('counts down while running and pauses', async () => {
    const { result } = renderHook(() => useSketchTimer(30, true, () => undefined))
    expect(result.current).toMatchObject({ left: 30, running: false, started: false })
    act(() => result.current.toggle())
    await advance(10_000)
    expect(result.current.left).toBeCloseTo(20, 0)
    act(() => result.current.toggle())
    await advance(5_000)
    expect(result.current).toMatchObject({ running: false, started: true })
    expect(result.current.left).toBeCloseTo(20, 0)
  })

  it('in a session, calls back at the end, counts the pose and starts again', async () => {
    const done = vi.fn()
    const { result } = renderHook(() => useSketchTimer(30, true, done))
    act(() => result.current.toggle())
    await advance(31_000)
    expect(done).toHaveBeenCalledTimes(1)
    expect(result.current.count).toBe(1)
    expect(result.current.running).toBe(true)
    expect(result.current.left).toBeGreaterThan(28)
  })

  it('without a session, stops at the end', async () => {
    const done = vi.fn()
    const { result } = renderHook(() => useSketchTimer(30, false, done))
    act(() => result.current.toggle())
    await advance(31_000)
    expect(done).toHaveBeenCalledTimes(1)
    expect(result.current).toMatchObject({ running: false, started: false, left: 30, count: 1 })
  })

  it('takes a new duration at once when stopped, and resets', async () => {
    const { result, rerender } = renderHook(({ d }) => useSketchTimer(d, true, () => undefined), {
      initialProps: { d: 30 },
    })
    rerender({ d: 120 })
    expect(result.current.left).toBe(120)
    act(() => result.current.toggle())
    await advance(2_000)
    act(() => result.current.reset())
    expect(result.current).toMatchObject({ left: 120, running: false, started: false, count: 0 })
  })
})
