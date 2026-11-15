/** Minimal shape of a paint the colour tools work with (generic colour or user tube). */
export interface PaintColor {
  readonly id: string
  /** "#rrggbb" */
  readonly hex: string
}

export function sameHex(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase()
}
