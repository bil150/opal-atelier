import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FINE_HOLD, PARTS_HOLD } from './hold-profiles'
import { HoldButton } from './HoldButton'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

function setup(limit = Infinity) {
  let count = 0
  const onStep = vi.fn((m: number) => {
    if (count >= limit) return false
    count += m
    return true
  })
  const onRelease = vi.fn()
  render(
    <HoldButton onStep={onStep} onRelease={onRelease} profile={PARTS_HOLD}>
      +
    </HoldButton>,
  )
  return { button: screen.getByRole('button', { name: '+' }), onStep, onRelease, total: () => count }
}

describe('HoldButton', () => {
  it('steps once on a click', () => {
    const { button, onStep, onRelease } = setup()
    fireEvent.pointerDown(button, { button: 0 })
    fireEvent.pointerUp(window)
    expect(onStep).toHaveBeenCalledOnce()
    expect(onRelease).toHaveBeenCalledOnce()
  })

  it('repeats while held, after a short delay', () => {
    const { button, onStep } = setup()
    fireEvent.pointerDown(button, { button: 0 })
    act(() => {
      vi.advanceTimersByTime(349)
    })
    expect(onStep).toHaveBeenCalledTimes(1)
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(onStep.mock.calls.length).toBeGreaterThan(5)
    fireEvent.pointerUp(window)
    const calls = onStep.mock.calls.length
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(onStep).toHaveBeenCalledTimes(calls)
  })

  it('takes bigger steps with Shift, and stops at a limit', () => {
    const { button, total } = setup(30)
    fireEvent.pointerDown(button, { button: 0, shiftKey: true })
    expect(total()).toBe(10)
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(total()).toBe(30)
  })

  it('steps once per key press', () => {
    const { button, onStep, onRelease } = setup()
    fireEvent.click(button, { detail: 0 })
    expect(onStep).toHaveBeenCalledWith(1)
    expect(onRelease).toHaveBeenCalledOnce()
  })

  it('speeds up over time', () => {
    expect(FINE_HOLD.interval(0)).toBe(110)
    expect(FINE_HOLD.interval(10_000)).toBe(25)
    expect([FINE_HOLD.multiplier(1000), FINE_HOLD.multiplier(2000), FINE_HOLD.multiplier(4000)]).toEqual([
      1, 2, 5,
    ])
    expect(PARTS_HOLD.multiplier(3000)).toBe(2)
  })
})
