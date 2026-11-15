import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Panel } from '@renderer/components/ui/Panel'
import { FIELD, TOOL_BUTTON } from '@renderer/components/ui/buttons'
import { MAX_EXPORT_CELLS } from './cell-export'
import { cellName, parseCellRefs, sortedCells, type CellKey } from './cell-refs'

interface CellsPanelProps {
  /** Size of the grid on the current image; null without an image. */
  readonly size: { readonly cols: number; readonly rows: number } | null
  readonly selection: ReadonlySet<CellKey>
  readonly onSelection: (selection: Set<CellKey>) => void
  readonly onExport: (cells: (readonly [number, number])[] | 'all') => Promise<boolean>
}

const refsOf = (selection: ReadonlySet<CellKey>) =>
  sortedCells(selection)
    .map(([c, r]) => cellName(c, r))
    .join(', ')

/** Cells chosen on the image or by reference (A1, B2, C1:C3), exported as PNG files. */
export function CellsPanel({ size, selection, onSelection, onExport }: CellsPanelProps) {
  const { t } = useTranslation()
  const [typed, setTyped] = useState<string | null>(null)
  const [rejected, setRejected] = useState<readonly string[]>([])
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  const total = size ? size.cols * size.rows : 0
  const tooMany = total > MAX_EXPORT_CELLS
  const count = selection.size

  const commit = (input: HTMLInputElement) => {
    if (typed === null || !size) {
      setTyped(null)
      return
    }
    const parsed = parseCellRefs(typed, size.cols, size.rows)
    if (parsed.rejected.length) {
      setRejected(parsed.rejected)
      input.select() // the refused text is selected: type over it
      return
    }
    setRejected([])
    setTyped(null)
    onSelection(parsed.cells)
  }

  const run = async (cells: (readonly [number, number])[] | 'all') => {
    setBusy(true)
    setFailed(false)
    try {
      setFailed(!(await onExport(cells)))
    } finally {
      setBusy(false)
    }
  }

  const status = rejected.length
    ? t('imageStudy.cells.unknown', { refs: rejected.slice(0, 3).join(', ') })
    : !size
      ? ''
      : count
        ? t('imageStudy.cells.chosen', { count, total })
        : t('imageStudy.cells.none', { total })

  return (
    <Panel title={t('imageStudy.cells.title')}>
      <input
        type="text"
        value={typed ?? refsOf(selection)}
        disabled={!size}
        aria-label={t('imageStudy.cells.refs')}
        aria-invalid={rejected.length > 0}
        placeholder={t('imageStudy.cells.placeholder')}
        autoComplete="off"
        spellCheck={false}
        onFocus={(e) => e.target.select()}
        onChange={(e) => {
          setTyped(e.target.value)
          setRejected([])
        }}
        onBlur={(e) => commit(e.target)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            commit(e.currentTarget)
          }
          if (e.key === 'Escape') {
            setTyped(null)
            setRejected([])
          }
        }}
        className={`${FIELD} ${rejected.length ? 'border-bad' : ''}`}
      />
      <p aria-live="polite" className={`text-[13px] ${rejected.length ? 'text-bad' : 'text-muted'}`}>
        {status}
      </p>
      {failed ? (
        <p role="alert" className="text-[13px] text-bad">
          {t('imageStudy.cells.failed')}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!count || busy}
          onClick={() => onSelection(new Set())}
          className={TOOL_BUTTON}
        >
          {t('imageStudy.cells.clear')}
        </button>
        <button
          type="button"
          disabled={!count || busy}
          title={t('imageStudy.cells.exportSelectionTitle')}
          onClick={() => void run(sortedCells(selection))}
          className={TOOL_BUTTON}
        >
          {t('imageStudy.cells.exportSelection')}
        </button>
        <button
          type="button"
          disabled={!size || busy || tooMany}
          title={tooMany ? t('imageStudy.cells.tooMany', { max: MAX_EXPORT_CELLS }) : undefined}
          onClick={() => void run('all')}
          className={TOOL_BUTTON}
        >
          {t('imageStudy.cells.exportAll')}
        </button>
      </div>
    </Panel>
  )
}
