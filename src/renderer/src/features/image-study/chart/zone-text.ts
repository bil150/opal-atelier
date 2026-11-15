/**
 * Text of a PDF area: the text items whose centre falls in the drawn zone (canvas coordinates), grouped
 * into lines from top to bottom, words left to right. No character recognition: the PDF's own text.
 */

export interface PositionedText {
  readonly text: string
  /** Left edge. */
  readonly x: number
  /** Vertical centre. */
  readonly y: number
  /** Width and height of the text box. */
  readonly width: number
  readonly height: number
}

export interface Zone {
  readonly x0: number
  readonly y0: number
  readonly x1: number
  readonly y1: number
}

/** A zone smaller than this (pixels) is a click, not an area. */
export const MIN_ZONE = 6

export function zoneLines(items: readonly PositionedText[], zone: Zone): string[] {
  const inside = items
    .filter((it) => it.text.trim())
    .filter((it) => {
      const cx = it.x + it.width / 2
      return cx >= zone.x0 && cx <= zone.x1 && it.y >= zone.y0 && it.y <= zone.y1
    })
    .sort((a, b) => a.y - b.y || a.x - b.x)

  const lines: { y: number; parts: PositionedText[] }[] = []
  for (const it of inside) {
    const current = lines[lines.length - 1]
    if (current && Math.abs(it.y - current.y) <= it.height * 0.6) current.parts.push(it)
    else lines.push({ y: it.y, parts: [it] })
  }
  return lines.map((l) =>
    l.parts
      .sort((a, b) => a.x - b.x)
      .map((p) => p.text)
      .join(' '),
  )
}

/** Zone from two corners, or null when it is too small to be an area. */
export function zoneFrom(a: { x: number; y: number }, b: { x: number; y: number }): Zone | null {
  const zone = {
    x0: Math.min(a.x, b.x),
    x1: Math.max(a.x, b.x),
    y0: Math.min(a.y, b.y),
    y1: Math.max(a.y, b.y),
  }
  return zone.x1 - zone.x0 < MIN_ZONE || zone.y1 - zone.y0 < MIN_ZONE ? null : zone
}
