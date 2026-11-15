import { useEffect, useLayoutEffect, useRef, type ButtonHTMLAttributes, type PointerEvent } from 'react'
import type { HoldProfile } from './hold-profiles'

interface HoldButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'onPointerDown'> {
  /** One step; `multiplier` grows while held, ×10 with Shift. Return false to stop repeating (at a limit). */
  readonly onStep: (multiplier: number) => unknown
  /** Called once the button is let go (or after a keyboard step): time to save. */
  readonly onRelease?: () => void
  readonly profile: HoldProfile
}

/**
 * A button that repeats while held, faster and faster. A click is one step; Enter and Space step once per press.
 * Held with the finger, no text selection or context menu shows up.
 */
export function HoldButton({ onStep, onRelease, profile, disabled, ...rest }: HoldButtonProps) {
  const timer = useRef(0)
  const holding = useRef(false)
  const props = useRef({ onStep, onRelease, profile })
  useLayoutEffect(() => {
    props.current = { onStep, onRelease, profile }
  })

  useEffect(() => {
    const stop = () => {
      clearTimeout(timer.current)
      if (holding.current) {
        holding.current = false
        props.current.onRelease?.()
      }
    }
    addEventListener('pointerup', stop)
    addEventListener('pointercancel', stop)
    addEventListener('blur', stop)
    return () => {
      clearTimeout(timer.current)
      removeEventListener('pointerup', stop)
      removeEventListener('pointercancel', stop)
      removeEventListener('blur', stop)
    }
  }, [])

  function begin(e: PointerEvent<HTMLButtonElement>) {
    if (e.button !== 0 || disabled) return
    e.preventDefault()
    clearTimeout(timer.current)
    const shift = e.shiftKey ? 10 : 1
    holding.current = true
    if (props.current.onStep(shift) === false) return
    let started = 0
    const repeat = () => {
      if (!holding.current) return
      const elapsed = Date.now() - started
      const { onStep: step, profile: p } = props.current
      if (step(shift * p.multiplier(elapsed)) === false) return
      timer.current = window.setTimeout(repeat, p.interval(elapsed))
    }
    timer.current = window.setTimeout(() => {
      started = Date.now()
      repeat()
    }, props.current.profile.delay)
  }

  return (
    <button
      type="button"
      disabled={disabled}
      {...rest}
      onPointerDown={begin}
      onClick={(e) => {
        if (e.detail !== 0) return // pointer clicks were handled on pointerdown
        onStep(e.shiftKey ? 10 : 1)
        onRelease?.()
      }}
      onContextMenu={(e) => e.preventDefault()}
    />
  )
}
