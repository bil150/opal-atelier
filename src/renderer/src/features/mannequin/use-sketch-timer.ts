import { useEffect, useLayoutEffect, useRef, useState } from 'react'

export interface SketchTimer {
  /** Seconds left. */
  readonly left: number
  readonly running: boolean
  /** Started at least once since the last reset (the chip on the stage shows). */
  readonly started: boolean
  /** Poses drawn in this session. */
  readonly count: number
  readonly toggle: () => void
  readonly reset: () => void
}

const TICK_MS = 200

/**
 * Countdown of a timed sketch. When the time is up, `onTimeUp` is called (a beep, a new pose) and the
 * count grows; the countdown starts again if `repeat`, otherwise it stops.
 */
export function useSketchTimer(duration: number, repeat: boolean, onTimeUp: () => void): SketchTimer {
  const [left, setLeft] = useState(duration)
  const [running, setRunning] = useState(false)
  const [started, setStarted] = useState(false)
  const [count, setCount] = useState(0)
  const latest = useRef({ duration, repeat, onTimeUp })
  useLayoutEffect(() => {
    latest.current = { duration, repeat, onTimeUp }
  })

  // A new duration applies at once when the timer isn't running.
  const [shownDuration, setShownDuration] = useState(duration)
  if (shownDuration !== duration) {
    setShownDuration(duration)
    if (!running) setLeft(duration)
  }

  // The countdown itself lives in a ref while running; the state shows it.
  const remaining = useRef(left)
  useEffect(() => {
    if (!running) return
    let last = performance.now()
    const id = window.setInterval(() => {
      const now = performance.now()
      remaining.current -= (now - last) / 1000
      last = now
      if (remaining.current <= 0) {
        const { duration: d, repeat: again, onTimeUp: done } = latest.current
        remaining.current = d
        done()
        setCount((c) => c + 1)
        if (!again) {
          clearInterval(id)
          setRunning(false)
          setStarted(false)
        }
      }
      setLeft(remaining.current)
    }, TICK_MS)
    return () => clearInterval(id)
  }, [running])

  return {
    left,
    running,
    started,
    count,
    toggle: () => {
      remaining.current = left
      setRunning(!running)
      setStarted(true)
    },
    reset: () => {
      setRunning(false)
      setStarted(false)
      setCount(0)
      setLeft(duration)
      remaining.current = duration
    },
  }
}

/** A short beep at the end of a pose; silent where audio isn't available. */
export function beep(): void {
  try {
    const context = new AudioContext()
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.frequency.value = 880
    gain.gain.setValueAtTime(0.0001, context.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.15, context.currentTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.35)
    oscillator.connect(gain).connect(context.destination)
    oscillator.start()
    oscillator.stop(context.currentTime + 0.4)
    oscillator.onended = () => void context.close()
  } catch {
    // no sound: no matter
  }
}
