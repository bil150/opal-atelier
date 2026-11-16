import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { HoldButton } from '@renderer/components/ui/HoldButton'
import { FINE_HOLD } from '@renderer/components/ui/hold-profiles'
import { Panel } from '@renderer/components/ui/Panel'
import { Segmented } from '@renderer/components/ui/Segmented'
import { TOOL_BUTTON } from '@renderer/components/ui/buttons'
import {
  FineAdjustment,
  LineStyle,
  MAX_COLUMNS,
  MAX_LINE_WIDTH,
  MIN_LINE_WIDTH,
  MAX_TYPED_COLUMNS,
  fineTune,
  isGridAdjusted,
  stepColumns,
  withColumns,
  type GridSettings,
} from './grid-settings'

type GridUpdate = (update: (grid: GridSettings) => GridSettings) => void

interface GridPanelProps {
  readonly grid: GridSettings
  readonly onGrid: GridUpdate
  /** Rows of the grid on the current image (null without an image). */
  readonly rows: number | null
  /** Width of the original image: fine tuning moves by its pixels. */
  readonly originalWidth: number | null
}

const columnsText = (grid: GridSettings) => String(Math.round((1 / grid.cell) * 100) / 100)

const FINE_BUTTONS: readonly {
  readonly what: FineAdjustment
  readonly sign: 1 | -1
  readonly label: 'smaller' | 'bigger' | 'left' | 'right' | 'up' | 'down'
  readonly text: string
}[] = [
  { what: FineAdjustment.Size, sign: -1, label: 'smaller', text: '−' },
  { what: FineAdjustment.Size, sign: 1, label: 'bigger', text: '+' },
  { what: FineAdjustment.X, sign: -1, label: 'left', text: '←' },
  { what: FineAdjustment.X, sign: 1, label: 'right', text: '→' },
  { what: FineAdjustment.Y, sign: -1, label: 'up', text: '↑' },
  { what: FineAdjustment.Y, sign: 1, label: 'down', text: '↓' },
]

/** Number of columns, fine tuning of the cell and its offset, labels. */
export function GridPanel({ grid, onGrid, rows, originalWidth }: GridPanelProps) {
  const { t } = useTranslation()
  const [typed, setTyped] = useState<string | null>(null)
  const shown = typed ?? columnsText(grid)

  const onType = (text: string) => {
    setTyped(text)
    const n = Number(text.replace(',', '.'))
    if (text.trim() && Number.isFinite(n) && n >= 1 && n <= MAX_TYPED_COLUMNS)
      onGrid((g) => withColumns(g, n))
  }
  const commit = () => {
    if (typed === null) return
    const n = Number(typed.replace(',', '.'))
    if (typed.trim() && Number.isFinite(n))
      onGrid((g) => withColumns(g, Math.min(MAX_COLUMNS, Math.max(1, n))))
    setTyped(null)
  }

  const fine = (what: FineAdjustment, sign: 1 | -1) => (multiplier: number) => {
    if (!originalWidth) return false
    onGrid((g) => fineTune(g, what, sign * multiplier, originalWidth))
    return true
  }

  const group = (label: string, buttons: typeof FINE_BUTTONS) => (
    <div role="group" aria-label={label} className="flex items-center gap-1.5">
      <span className="min-w-14 text-[13px] text-muted">{label}</span>
      {buttons.map((b) => (
        <HoldButton
          key={b.label}
          profile={FINE_HOLD}
          onStep={fine(b.what, b.sign)}
          disabled={!originalWidth}
          aria-label={t(`imageStudy.grid.${b.label}`)}
          title={t(`imageStudy.grid.${b.label}`)}
          className={`${TOOL_BUTTON} min-w-9 px-0`}
        >
          {b.text}
        </HoldButton>
      ))}
    </div>
  )

  return (
    <Panel title={t('imageStudy.grid.title')} defaultOpen>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center overflow-hidden rounded-lg border border-line bg-paper-2">
          <button
            type="button"
            aria-label={t('imageStudy.grid.fewer')}
            disabled={1 / grid.cell <= 1.0001}
            onClick={() => {
              setTyped(null)
              onGrid((g) => stepColumns(g, -1))
            }}
            className="h-9 w-8 text-[17px] font-semibold enabled:hover:bg-highlight disabled:opacity-40"
          >
            −
          </button>
          <input
            type="text"
            inputMode="decimal"
            value={shown}
            aria-label={t('imageStudy.grid.columns')}
            onChange={(e) => onType(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit()
              if (e.key === 'Escape') setTyped(null)
            }}
            className="w-14 bg-transparent text-center text-[15px] font-bold tabular-nums"
          />
          <button
            type="button"
            aria-label={t('imageStudy.grid.more')}
            disabled={1 / grid.cell >= MAX_COLUMNS - 0.0001}
            onClick={() => {
              setTyped(null)
              onGrid((g) => stepColumns(g, 1))
            }}
            className="h-9 w-8 text-[17px] font-semibold enabled:hover:bg-highlight disabled:opacity-40"
          >
            +
          </button>
        </div>
        <span className="text-sm text-muted">
          {t('imageStudy.grid.columnsUnit')}
          {rows === null ? '' : ` ${t('imageStudy.grid.rows', { count: rows })}`}
        </span>
      </div>
      {group(t('imageStudy.grid.cell'), FINE_BUTTONS.slice(0, 2))}
      {group(t('imageStudy.grid.shift'), FINE_BUTTONS.slice(2))}
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={grid.letters}
            onChange={(e) => onGrid((g) => ({ ...g, letters: e.target.checked }))}
          />
          {t('imageStudy.grid.letters')}
        </label>
        <button
          type="button"
          disabled={!isGridAdjusted(grid)}
          onClick={() => {
            setTyped(null)
            onGrid((g) => withColumns(g, Math.max(1, Math.round(1 / g.cell))))
          }}
          className={`${TOOL_BUTTON} ml-auto`}
        >
          {t('imageStudy.grid.reset')}
        </button>
      </div>
    </Panel>
  )
}

const STYLE_PATTERNS: Readonly<Record<LineStyle, string>> = {
  [LineStyle.Solid]: '',
  [LineStyle.Dashed]: '6 4',
  [LineStyle.Dotted]: '1.5 3.5',
}

/** Colour, width and style of the lines. */
export function GridStylePanel({ grid, onGrid }: Pick<GridPanelProps, 'grid' | 'onGrid'>) {
  const { t, i18n } = useTranslation()
  return (
    <Panel title={t('imageStudy.grid.line')}>
      <label className="flex items-center gap-3 text-sm">
        <input
          type="color"
          value={grid.color}
          onChange={(e) => onGrid((g) => ({ ...g, color: e.target.value.toLowerCase() }))}
          className="h-9 w-12 cursor-pointer rounded-md border border-line bg-paper-2"
        />
        {t('imageStudy.grid.colour')}
      </label>
      <label className="flex items-center gap-3 text-sm">
        <span className="min-w-14 text-muted">{t('imageStudy.grid.width')}</span>
        <input
          type="range"
          min={MIN_LINE_WIDTH}
          max={MAX_LINE_WIDTH}
          step={0.01}
          value={grid.width}
          onChange={(e) => onGrid((g) => ({ ...g, width: Math.round(Number(e.target.value) * 100) / 100 }))}
          className="flex-1"
        />
        <output className="w-10 text-right tabular-nums">
          {new Intl.NumberFormat(i18n.resolvedLanguage ?? 'en', {
            minimumFractionDigits: 1,
            maximumFractionDigits: 2,
          }).format(grid.width)}
        </output>
      </label>
      <Segmented
        label={t('imageStudy.grid.style')}
        value={grid.lineStyle}
        onChange={(lineStyle) => onGrid((g) => ({ ...g, lineStyle }))}
        stretch
        options={Object.values(LineStyle).map((style) => ({
          value: style,
          ariaLabel: t(`imageStudy.grid.styles.${style}`),
          title: t(`imageStudy.grid.styles.${style}`),
          label: (
            <svg viewBox="0 0 36 8" aria-hidden="true" className="h-2 w-9">
              <path
                d="M2 4h32"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray={STYLE_PATTERNS[style] || undefined}
              />
            </svg>
          ),
        }))}
      />
    </Panel>
  )
}
