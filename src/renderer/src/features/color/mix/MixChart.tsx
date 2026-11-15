import { useId, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { useTranslation } from 'react-i18next'
import {
  cssColor,
  mixPaints,
  polygonPath,
  reduceParts,
  type Point,
  type Rgb01,
} from '@renderer/lib/color-theory'

/** Triangle corners: colour 1 at the top, 2 bottom left, 3 bottom right. */
const TRIANGLE: readonly [Point, Point, Point] = [
  [0, -86],
  [-99, 86],
  [99, 86],
]
const TRIANGLE_STEPS = 12
const BAND_STEPS = 20
const f2 = (v: number) => v.toFixed(2)

interface MixChartProps {
  readonly hexes: readonly string[]
  readonly names: readonly string[]
  readonly parts: readonly number[]
  readonly shown: (c: Rgb01) => Rgb01
  /** New whole parts while dragging (not yet saved). */
  readonly onParts: (parts: number[]) => void
}

/**
 * Every possible mix: a band from colour 1 to colour 2, or a triangle for 3 colours.
 * Drag the marker (mouse, finger) or push it with the arrow keys: the parts follow.
 */
export function MixChart({ hexes, names, parts, shown, onParts }: MixChartProps) {
  const { t } = useTranslation()
  const svgRef = useRef<SVGSVGElement>(null)
  const clipId = useId()
  const [dragging, setDragging] = useState(false)
  const two = hexes.length === 2
  const sum = parts.reduce((a, b) => a + b, 0)
  const weights = sum ? parts : parts.map(() => 1)
  const total = weights.reduce((a, b) => a + b, 0)
  const fill = (w: readonly number[]) => cssColor(shown(mixPaints(hexes, w)))

  const setFromPointer = (e: PointerEvent) => {
    const matrix = svgRef.current?.getScreenCTM()
    if (!matrix) return
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(matrix.inverse())
    let next: number[]
    if (two) {
      const k = Math.round(Math.min(1, Math.max(0, (p.x + 100) / 200)) * BAND_STEPS)
      next = reduceParts([BAND_STEPS - k, k])
    } else {
      // Barycentric coordinates of the point, brought inside the triangle and rounded to twelfths.
      const [A, B, C] = TRIANGLE
      const det = (B[1] - C[1]) * (A[0] - C[0]) + (C[0] - B[0]) * (A[1] - C[1])
      const l1 = ((B[1] - C[1]) * (p.x - C[0]) + (C[0] - B[0]) * (p.y - C[1])) / det
      const l2 = ((C[1] - A[1]) * (p.x - C[0]) + (A[0] - C[0]) * (p.y - C[1])) / det
      const q = [l1, l2, 1 - l1 - l2].map((v) => Math.max(0, v))
      const s = q.reduce((a, b) => a + b, 0)
      const rounded = q.map((v) => Math.round((v / s) * TRIANGLE_STEPS))
      if (!rounded.some((v) => v > 0)) return
      next = reduceParts(rounded)
    }
    if (next.some((v, i) => v !== parts[i])) onParts(next)
  }

  const handleKey = (e: KeyboardEvent) => {
    if (!two) return
    const d = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key]
    if (d === undefined) return
    e.preventDefault()
    const k = Math.max(0, Math.min(BAND_STEPS, Math.round(((parts[1] ?? 0) / (sum || 1)) * BAND_STEPS) + d))
    onParts(reduceParts([BAND_STEPS - k, k]))
  }

  const pointerHandlers = {
    onPointerDown: (e: PointerEvent<SVGSVGElement>) => {
      if (e.button !== 0) return
      setDragging(true)
      e.currentTarget.setPointerCapture(e.pointerId)
      setFromPointer(e)
    },
    onPointerMove: (e: PointerEvent<SVGSVGElement>) => {
      if (dragging) setFromPointer(e)
    },
    onPointerUp: () => setDragging(false),
    onPointerCancel: () => setDragging(false),
  }
  const svgClass = `block h-auto max-h-full w-full touch-none outline-none select-none focus-visible:rounded-md focus-visible:shadow-[0_0_0_2px_var(--color-ink)] ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`
  const knob =
    'stroke-ink stroke-2 [filter:drop-shadow(0_0_2px_var(--color-paper))] transition-[r] duration-100'
  const labelClass = 'fill-ink text-[7.5px] font-semibold opacity-80'

  if (two) {
    const x0 = -100
    const width = 200
    const cell = width / (BAND_STEPS + 1)
    const share = (weights[1] ?? 0) / total
    const x = x0 + cell / 2 + share * (width - cell)
    const pct = Math.round(share * 100)
    return (
      <svg
        ref={svgRef}
        viewBox="-104 -24 208 64"
        role="slider"
        tabIndex={0}
        aria-label={t('color.mix.chart')}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-valuetext={`${100 - pct} % ${names[0] ?? ''}, ${pct} % ${names[1] ?? ''}`}
        onKeyDown={handleKey}
        className={svgClass}
        {...pointerHandlers}
      >
        <defs>
          <clipPath id={clipId}>
            <rect x={x0} y={-14} width={width} height={28} rx={6} />
          </clipPath>
        </defs>
        <g clipPath={`url(#${clipId})`}>
          {Array.from({ length: BAND_STEPS + 1 }, (_, k) => {
            const s = k / BAND_STEPS
            return (
              <rect
                key={k}
                x={f2(x0 + k * cell)}
                y={-14}
                width={f2(cell + 0.3)}
                height={28}
                fill={fill([1 - s, s])}
              />
            )
          })}
        </g>
        <rect x={x0} y={-14} width={width} height={28} rx={6} className="fill-none stroke-line stroke-[.8]" />
        <line x1={f2(x)} y1={-19} x2={f2(x)} y2={19} className="stroke-ink stroke-[1.2] opacity-60" />
        <circle cx={f2(x)} cy={0} r={dragging ? 10 : 8} fill={fill(weights)} className={knob} />
        <text x={x0} y={31} textAnchor="start" className={labelClass}>
          {t('color.mix.moreOf', { name: names[0]?.toLowerCase() })}
        </text>
        <text x={x0 + width} y={31} textAnchor="end" className={labelClass}>
          {t('color.mix.moreOf', { name: names[1]?.toLowerCase() })}
        </text>
      </svg>
    )
  }

  const at = (a: number, b: number, c: number): Point => [
    (a * TRIANGLE[0][0] + b * TRIANGLE[1][0] + c * TRIANGLE[2][0]) / TRIANGLE_STEPS,
    (a * TRIANGLE[0][1] + b * TRIANGLE[1][1] + c * TRIANGLE[2][1]) / TRIANGLE_STEPS,
  ]
  const cells: { d: string; w: number[] }[] = []
  for (let a = 0; a < TRIANGLE_STEPS; a++) {
    for (let b = 0; a + b < TRIANGLE_STEPS; b++) {
      const c = TRIANGLE_STEPS - 1 - a - b
      cells.push({
        d: polygonPath([at(a + 1, b, c), at(a, b + 1, c), at(a, b, c + 1)]),
        w: [a + 1 / 3, b + 1 / 3, c + 1 / 3],
      })
      if (c > 0) {
        cells.push({
          d: polygonPath([at(a + 1, b + 1, c - 1), at(a + 1, b, c), at(a, b + 1, c)]),
          w: [a + 2 / 3, b + 2 / 3, c - 1 / 3],
        })
      }
    }
  }
  const marker = at(
    (TRIANGLE_STEPS * (weights[0] ?? 0)) / total,
    (TRIANGLE_STEPS * (weights[1] ?? 0)) / total,
    (TRIANGLE_STEPS * (weights[2] ?? 0)) / total,
  )
  return (
    <svg
      ref={svgRef}
      viewBox="-112 -106 224 222"
      role="slider"
      tabIndex={0}
      aria-label={t('color.mix.chart')}
      aria-valuetext={weights
        .map((v, i) => `${Math.round((v / total) * 100)} % ${names[i] ?? ''}`)
        .join(', ')}
      className={svgClass}
      {...pointerHandlers}
    >
      {cells.map((cell, i) => (
        <path key={i} d={cell.d} fill={fill(cell.w)} />
      ))}
      <path d={polygonPath(TRIANGLE)} className="fill-none stroke-line stroke-[.8]" />
      <circle
        cx={f2(marker[0])}
        cy={f2(marker[1])}
        r={dragging ? 10 : 7}
        fill={fill(weights)}
        className={knob}
      />
      <text x={0} y={-94} textAnchor="middle" className={labelClass}>
        {names[0]}
      </text>
      <text x={-99} y={102} textAnchor="start" className={labelClass}>
        {names[1]}
      </text>
      <text x={99} y={102} textAnchor="end" className={labelClass}>
        {names[2]}
      </text>
    </svg>
  )
}
