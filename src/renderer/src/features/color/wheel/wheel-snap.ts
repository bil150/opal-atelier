import { mod } from '@renderer/lib/color-theory'

/** Angle between two sectors; 1° when the wheel is continuous (segments = 0). */
export function wheelStep(segments: number): number {
  return segments ? 360 / segments : 1
}

/** Rounds an angle to the nearest sector of the wheel. */
export function snapAngle(angle: number, segments: number): number {
  const step = wheelStep(segments)
  return mod(Math.round(angle / step) * step, 360)
}
