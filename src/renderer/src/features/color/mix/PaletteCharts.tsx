import { useTranslation } from 'react-i18next'
import {
  GAMUT_RADIUS,
  cssColor,
  fromOklab,
  gamutPoint,
  hexToRgb01,
  mixWithWhite,
  polygonPath,
  ringHueOklab,
  sectorPath,
  whiteDoses,
  type PaletteReach,
  type Rgb01,
} from '@renderer/lib/color-theory'

const f2 = (v: number) => v.toFixed(2)

interface PaletteChartProps {
  readonly hexes: readonly string[]
  readonly names: readonly string[]
  readonly white: boolean
  readonly shown: (c: Rgb01) => Rgb01
}

const CELL = 20
const COLUMNS = 9
const BLOCK_WIDTH = CELL * COLUMNS
const GAP_X = 20
const LABEL = 13

/** One block per pair of colours: 9 cells from one to the other, then one row per dose of white. */
export function MixingPlate({ hexes, names, white, shown }: PaletteChartProps) {
  const { t } = useTranslation()
  const n = hexes.length
  const doses = whiteDoses(white)
  const pairs: [number, number][] = []
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) pairs.push([i, j])
  const blockHeight = LABEL + CELL * doses.length + 12
  const perRow = n > 4 ? 3 : n > 2 ? 2 : 1
  const rows = Math.ceil(pairs.length / perRow)
  const list = names.join(', ')

  return (
    <svg
      viewBox={`0 0 ${BLOCK_WIDTH * perRow + GAP_X} ${rows * blockHeight}`}
      role="img"
      aria-label={white ? t('color.mix.plateWithWhite', { list }) : t('color.mix.plate', { list })}
      className="block h-auto max-h-full w-full"
    >
      {pairs.map(([i, j], k) => {
        const x0 = (k % perRow) * (BLOCK_WIDTH + GAP_X)
        const y0 = Math.floor(k / perRow) * blockHeight
        return (
          <g key={`${i}-${j}`}>
            <text x={x0} y={y0 + 9} className="fill-ink text-[8.5px] font-semibold opacity-80">
              {names[i]} + {names[j]}
            </text>
            {doses.map((dose, r) =>
              Array.from({ length: COLUMNS }, (_, c) => {
                const a = 1 - c / (COLUMNS - 1)
                const w = hexes.map((_, q) => (q === i ? a : q === j ? 1 - a : 0))
                return (
                  <rect
                    key={`${r}-${c}`}
                    x={x0 + c * CELL}
                    y={y0 + LABEL + r * CELL}
                    width={CELL + 0.3}
                    height={CELL + 0.3}
                    fill={cssColor(shown(mixWithWhite(hexes, w, dose)))}
                  />
                )
              }),
            )}
            <rect
              x={x0}
              y={y0 + LABEL}
              width={BLOCK_WIDTH}
              height={CELL * doses.length}
              className="fill-none stroke-line stroke-[.8]"
            />
          </g>
        )
      })}
    </svg>
  )
}

/** Every mix as a dot on a hue/chroma disc, the shape around them, and the palette's own tubes. */
export function ReachWheel({ hexes, shown, reach }: PaletteChartProps & { readonly reach: PaletteReach }) {
  const { t } = useTranslation()
  return (
    <svg
      viewBox="-110 -110 220 220"
      role="img"
      aria-label={t('color.mix.reach')}
      className="block h-auto max-h-full w-full"
    >
      {/* Reference ring: the wheel's hues at mid saturation */}
      {Array.from({ length: 120 }, (_, i) => {
        const a = i * 3
        return (
          <path
            key={a}
            d={sectorPath(a - 1.5, a + 1.6, 100, 93)}
            fill={cssColor(shown(fromOklab(ringHueOklab(a))))}
          />
        )
      })}
      <circle
        cx="0"
        cy="0"
        r={GAMUT_RADIUS}
        className="fill-none stroke-line stroke-[.6] [stroke-dasharray:2_2]"
      />
      {reach.hull.length > 2 ? (
        <path
          d={polygonPath(reach.hull)}
          className="fill-[color-mix(in_srgb,var(--color-ink)_6%,transparent)] stroke-ink stroke-[1.2] [stroke-linejoin:round]"
        />
      ) : null}
      {reach.samples.map((s, i) => (
        <circle
          key={i}
          cx={f2(s.gamut.point[0])}
          cy={f2(s.gamut.point[1])}
          r="2.4"
          fill={cssColor(shown(s.color))}
        />
      ))}
      {hexes.map((hex, i) => {
        const c = hexToRgb01(hex)
        const g = gamutPoint(c)
        return (
          <circle
            key={i}
            cx={f2(g.point[0])}
            cy={f2(g.point[1])}
            r="5"
            fill={cssColor(shown(c))}
            className="stroke-ink stroke-[1.6]"
          />
        )
      })}
    </svg>
  )
}
