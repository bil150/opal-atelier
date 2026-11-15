import { useId, useRef, type KeyboardEvent, type PointerEvent } from 'react'
import { useTranslation } from 'react-i18next'
import {
  HARMONY_OFFSETS,
  PRIMARY_ANGLES,
  WheelMode,
  cssColor,
  desaturate,
  grabbedOffset,
  harmonyAngles,
  mod,
  polar,
  polygonPath,
  readableInk,
  sectorPath,
  toGrey,
  wheelColor,
  type Point,
  type Rgb01,
} from '@renderer/lib/color-theory'
import { WheelStyle, type WheelSettings } from '../color-settings'
import { useHueNames } from '../use-hue-names'
import { snapAngle, wheelStep } from './wheel-snap'

const R_OUT = 100
const R_IN = 60
const R_MARK = 80
const f2 = (v: number) => v.toFixed(2)

interface ColorWheelProps {
  readonly settings: WheelSettings
  readonly onBaseChange: (base: number) => void
}

/** The interactive wheel: drag a marker (or anywhere on the ring) to rotate the harmony. */
export function ColorWheel({ settings, onBaseChange }: ColorWheelProps) {
  const { t } = useTranslation()
  const svgRef = useRef<SVGSVGElement>(null)
  const grab = useRef<number | null>(null)
  const clipPrefix = useId()
  const hueName = useHueNames(settings.mode)
  const { mode, style, saturation, segments, grey, harmony } = settings
  const base = snapAngle(settings.base, segments)

  const colorAt = (angle: number) => desaturate(wheelColor(mode, angle), saturation)
  const shown = (c: Rgb01) => (grey ? toGrey(c) : c)
  const fill = (c: Rgb01) => cssColor(shown(c))
  const angles = harmonyAngles(harmony, base)
  const offsets = HARMONY_OFFSETS[harmony]

  const pointerAngle = (e: PointerEvent): { angle: number; radius: number } | null => {
    const matrix = svgRef.current?.getScreenCTM()
    if (!matrix) return null
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(matrix.inverse())
    return { angle: mod((Math.atan2(p.x, -p.y) * 180) / Math.PI, 360), radius: Math.hypot(p.x, p.y) }
  }

  const handlePointerDown = (e: PointerEvent<SVGSVGElement>) => {
    if (style === WheelStyle.Discs) return // the discs don't rotate
    const q = pointerAngle(e)
    if (!q || q.radius < R_IN - 10) return
    grab.current = grabbedOffset(harmony, base, q.angle)
    e.currentTarget.setPointerCapture(e.pointerId)
    onBaseChange(snapAngle(q.angle - grab.current, segments))
  }
  const handlePointerMove = (e: PointerEvent<SVGSVGElement>) => {
    if (grab.current === null) return
    const q = pointerAngle(e)
    if (!q) return
    const next = snapAngle(q.angle - grab.current, segments)
    if (next !== base) onBaseChange(next)
  }
  const release = () => {
    grab.current = null
  }
  const handleKeyDown = (e: KeyboardEvent<SVGSVGElement>) => {
    const step = segments ? wheelStep(segments) : 5
    const by = { ArrowRight: step, ArrowUp: step, ArrowLeft: -step, ArrowDown: -step }[e.key]
    if (by === undefined) return
    e.preventDefault()
    onBaseChange(snapAngle(base + by * (e.shiftKey ? 3 : 1), segments))
  }

  const label =
    style === WheelStyle.Discs
      ? t('color.wheel.fixedLabel', {
          colors: PRIMARY_ANGLES.flatMap((a) => [hueName(a).name, hueName(a + 60).name]).join(', '),
        })
      : t('color.wheel.label', {
          harmony: t(`color.wheel.harmonies.${harmony}`).toLowerCase(),
          colors: angles.map((a) => hueName(a).name).join(', '),
        })

  return (
    <svg
      ref={svgRef}
      viewBox="-110 -110 220 220"
      tabIndex={0}
      role="img"
      aria-label={label}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={release}
      onPointerCancel={release}
      onKeyDown={handleKeyDown}
      className={`block size-full touch-none outline-none select-none focus-visible:rounded-lg focus-visible:shadow-[inset_0_0_0_2px_var(--color-ink)] ${style === WheelStyle.Discs ? 'cursor-default' : 'cursor-pointer'}`}
    >
      {style === WheelStyle.Discs ? (
        <Discs mode={mode} saturation={saturation} colorAt={colorAt} shown={shown} clipPrefix={clipPrefix} />
      ) : (
        <>
          <g>
            {Array.from({ length: segments || 360 }, (_, i) => {
              const width = 360 / (segments || 360)
              const a = i * width
              const overlap = segments ? 0 : 0.6 // continuous: a slight overlap avoids hairlines between sectors
              return (
                <path
                  key={i}
                  d={sectorPath(a - width / 2, a + width / 2 + overlap, R_OUT, R_IN)}
                  fill={fill(colorAt(a))}
                  className={segments ? 'stroke-paper stroke-[.35]' : ''}
                />
              )
            })}
          </g>
          {style === WheelStyle.Centre ? (
            <g>
              {PRIMARY_ANGLES.map((a) => {
                const r = 52
                const p = polar(a, r)
                return (
                  <g key={a} className="stroke-paper stroke-[.8] [stroke-linejoin:round]">
                    <path
                      d={polygonPath([p, polar(a + 60, r / 2), [0, 0], polar(a - 60, r / 2)])}
                      fill={fill(colorAt(a))}
                    />
                    <path
                      d={polygonPath([p, polar(a + 60, r), polar(a + 120, r)])}
                      fill={fill(colorAt(a + 60))}
                    />
                  </g>
                )
              })}
            </g>
          ) : (
            <HarmonyLink angles={angles} />
          )}
          {angles.map((a, i) => {
            const [x, y] = polar(a, R_MARK)
            const isBase = offsets[i] === 0
            return (
              <circle
                key={offsets[i]}
                cx={f2(x)}
                cy={f2(y)}
                r={isBase ? 8 : 6.5}
                fill={fill(colorAt(a))}
                className={`cursor-grab stroke-ink ${isBase ? 'stroke-[2.6]' : 'stroke-[1.6]'}`}
              />
            )
          })}
        </>
      )}
    </svg>
  )
}

/** Ring style: the harmony's markers joined by a line. */
function HarmonyLink({ angles }: { readonly angles: readonly number[] }) {
  const d =
    [...angles]
      .sort((a, b) => a - b)
      .map((a, k) => {
        const [x, y] = polar(a, R_MARK)
        return `${k ? 'L' : 'M'}${f2(x)} ${f2(y)}`
      })
      .join('') + (angles.length > 2 ? 'Z' : '')
  return <path d={d} className="fill-none stroke-ink stroke-[1.2] [stroke-linejoin:round]" />
}

/**
 * Overlapping discs: subtractive (painter's wheel, on white) or additive (light, on black).
 * Two primaries overlap into the secondary; all three into chromatic black or white.
 */
function Discs({
  mode,
  saturation,
  colorAt,
  shown,
  clipPrefix,
}: {
  readonly mode: WheelMode
  readonly saturation: number
  readonly colorAt: (angle: number) => Rgb01
  readonly shown: (c: Rgb01) => Rgb01
  readonly clipPrefix: string
}) {
  const { t } = useTranslation()
  const hueName = useHueNames(mode)
  const light = mode === WheelMode.Light
  const R = 54
  const centres: readonly Point[] = PRIMARY_ANGLES.map((a) => polar(a, 27))
  const clipId = (i: number) => `${clipPrefix}disc${i}`
  const centreColor: Rgb01 = light ? [1, 1, 1] : desaturate([0.2, 0.17, 0.17], saturation)
  const disc = (i: number, color: Rgb01) => {
    const [x, y] = centres[i] ?? [0, 0]
    return <circle cx={f2(x)} cy={f2(y)} r={R} fill={cssColor(shown(color))} />
  }
  const label = (p: Point, text: string, background: Rgb01, small = false) => (
    <text
      key={`${text}${p[0]}`}
      x={f2(p[0])}
      y={f2(p[1])}
      fill={readableInk(shown(background))}
      className={`pointer-events-none text-center font-semibold tracking-[.02em] [dominant-baseline:central] [text-anchor:middle] ${small ? 'text-[5.6px]' : 'text-[7px]'}`}
    >
      {text}
    </text>
  )

  return (
    <>
      <circle cx="0" cy="0" r="99" fill={light ? '#000' : '#fff'} className="stroke-line stroke-[.6]" />
      <defs>
        {centres.map((c, i) => (
          <clipPath key={i} id={clipId(i)}>
            <circle cx={f2(c[0])} cy={f2(c[1])} r={R} />
          </clipPath>
        ))}
      </defs>
      {PRIMARY_ANGLES.map((a, i) => (
        <g key={a}>{disc(i, colorAt(a))}</g>
      ))}
      {PRIMARY_ANGLES.map((a, i) => (
        <g key={a} clipPath={`url(#${clipId(i)})`}>
          {disc((i + 1) % 3, colorAt(a + 60))}
        </g>
      ))}
      <g clipPath={`url(#${clipId(0)})`}>
        <g clipPath={`url(#${clipId(1)})`}>{disc(2, centreColor)}</g>
      </g>
      {/* A thin border in the background colour separates the zones */}
      {centres.map((c, i) => (
        <circle
          key={i}
          cx={f2(c[0])}
          cy={f2(c[1])}
          r={R}
          fill="none"
          stroke={light ? '#000' : '#fff'}
          strokeWidth="1.2"
        />
      ))}
      {PRIMARY_ANGLES.flatMap((a) => [
        label(polar(a, 57), hueName(a).name, colorAt(a)),
        label(polar(a + 60, 43), hueName(a + 60).name, colorAt(a + 60)),
      ])}
      {light ? (
        label([0, 0], t('color.wheel.white'), centreColor)
      ) : (
        <>
          {label([0, -3.4], t('color.wheel.blackTop'), centreColor, true)}
          {label([0, 3.4], t('color.wheel.blackBottom'), centreColor, true)}
        </>
      )}
    </>
  )
}
