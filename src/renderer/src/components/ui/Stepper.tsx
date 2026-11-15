import { useEffect, useLayoutEffect, useRef, type MouseEvent, type PointerEvent } from 'react'

interface StepperProps {
  readonly value: number
  readonly min: number
  readonly max: number
  readonly decreaseLabel: string
  readonly increaseLabel: string
  readonly valueLabel: string
  /** Called on every step, including while a button is held down. */
  readonly onChange: (value: number) => void
}

const HOLD_DELAY = 350

interface Hold {
  readonly direction: number
  started: number
  timer: number
  value: number
}

/**
 * − value +. A click is one step; holding a button keeps stepping, faster and faster
 * (double steps after 2.5 s). Only the number changes meanwhile, so the buttons stay under the finger.
 */
export function Stepper({
  value,
  min,
  max,
  decreaseLabel,
  increaseLabel,
  valueLabel,
  onChange,
}: StepperProps) {
  const hold = useRef<Hold | null>(null)
  const props = useRef({ onChange, min, max })
  useLayoutEffect(() => {
    props.current = { onChange, min, max }
  })

  useEffect(() => {
    const stop = () => {
      if (hold.current) clearTimeout(hold.current.timer)
      hold.current = null
    }
    addEventListener('pointerup', stop)
    addEventListener('pointercancel', stop)
    addEventListener('blur', stop)
    return () => {
      stop()
      removeEventListener('pointerup', stop)
      removeEventListener('pointercancel', stop)
      removeEventListener('blur', stop)
    }
  }, [])

  function stepBy(h: Hold, by: number): boolean {
    const { min: lo, max: hi, onChange: change } = props.current
    const next = Math.max(lo, Math.min(hi, h.value + by))
    if (next === h.value) return false
    h.value = next
    change(next)
    return true
  }

  function repeat(h: Hold) {
    if (hold.current !== h) return
    const elapsed = Date.now() - h.started
    if (!stepBy(h, h.direction * (elapsed > 2500 ? 2 : 1))) {
      hold.current = null
      return
    }
    h.timer = window.setTimeout(() => repeat(h), Math.max(40, 140 - elapsed / 15))
  }

  function begin(e: PointerEvent<HTMLButtonElement>, direction: number) {
    if (e.button !== 0) return
    e.preventDefault()
    if (hold.current) clearTimeout(hold.current.timer)
    const h: Hold = { direction, started: 0, timer: 0, value }
    hold.current = h
    stepBy(h, direction)
    h.timer = window.setTimeout(() => {
      h.started = Date.now()
      repeat(h)
    }, HOLD_DELAY)
  }

  // Keyboard (Enter, Space): one step per press. Pointer clicks were already handled on pointerdown.
  function keyStep(e: MouseEvent, direction: number) {
    if (e.detail !== 0) return
    const next = Math.max(min, Math.min(max, value + direction))
    if (next !== value) onChange(next)
  }

  const button =
    'h-9 w-8 select-none bg-transparent text-[17px] font-semibold text-ink [-webkit-touch-callout:none] hover:bg-highlight'
  return (
    <div className="flex items-center overflow-hidden rounded-lg border border-line bg-paper-2">
      <button
        type="button"
        aria-label={decreaseLabel}
        onPointerDown={(e) => begin(e, -1)}
        onClick={(e) => keyStep(e, -1)}
        onContextMenu={(e) => e.preventDefault()}
        className={button}
      >
        −
      </button>
      <output aria-label={valueLabel} className="min-w-[26px] text-center text-[15px] font-bold tabular-nums">
        {value}
      </output>
      <button
        type="button"
        aria-label={increaseLabel}
        onPointerDown={(e) => begin(e, 1)}
        onClick={(e) => keyStep(e, 1)}
        onContextMenu={(e) => e.preventDefault()}
        className={button}
      >
        +
      </button>
    </div>
  )
}
