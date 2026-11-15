import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BUTTON, BUTTON_GHOST, TOOL_BUTTON } from '@renderer/components/ui/buttons'
import { Segmented } from '@renderer/components/ui/Segmented'
import type { ImportPlan } from '@renderer/features/paints/import-plan'
import { TubeStatus, groupNames, type PaintTube } from '@renderer/features/paints/paint-tube'
import type { CalculationOptions } from '@renderer/features/paints/tube-classification'
import {
  DraftError,
  draftOf,
  emptyDraft,
  listText,
  saveDraft,
  setStatus,
  type TubeDraft,
} from '@renderer/features/paints/tube-draft'
import { TubeFilter } from '@renderer/features/paints/tube-filter'
import { getTubeStore, useTubes } from '@renderer/features/paints/tube-store'
import { ALL_GROUPS, ChartsTab } from '@renderer/features/paints/ui/charts-tab'
import { SwatchChartsDialog } from '@renderer/features/paints/ui/SwatchChartsDialog'
import { TubeForm } from '@renderer/features/paints/ui/TubeForm'
import { TubeList } from '@renderer/features/paints/ui/TubeList'
import { useCopyMessage } from '@renderer/features/paints/use-copy-message'
import { rgbToHex } from '@renderer/lib/pixels'
import { readTubeText } from '@renderer/lib/swatch-chart'
import { ManufacturerChart } from '../chart/ManufacturerChart'

interface FormState {
  readonly draft: TubeDraft
  readonly editingId: string | null
  readonly error: DraftError | null
  readonly focusName: boolean
}

interface PaintsViewProps {
  readonly options: CalculationOptions
  readonly charts: { readonly open: boolean; readonly tab: ChartsTab; readonly group: string }
  readonly onCharts: (charts: { open: boolean; tab: ChartsTab; group: string }) => void
  readonly clearSignal: number
}

/** Physical colours: the user's tubes, the manufacturer's chart to read them from, swatch charts. */
export function PaintsView({ options, charts, onCharts, clearSignal }: PaintsViewProps) {
  const { t, i18n } = useTranslation()
  const { tubes, storageOk } = useTubes()
  const store = getTubeStore()
  const [form, setForm] = useState<FormState | null>(null)
  const [lastGroup, setLastGroup] = useState('')
  const [filter, setFilter] = useState(TubeFilter.All)
  const [query, setQuery] = useState('')
  const [note, setNote] = useState('')
  const [wide, setWide] = useState(false)
  const [copyMessage, copy] = useCopyMessage()

  const owned = tubes.filter((tube) => tube.status === TubeStatus.Owned)
  const wanted = tubes.filter((tube) => tube.status === TubeStatus.Wanted)
  const counts: Record<TubeFilter, number> = {
    [TubeFilter.All]: tubes.length,
    [TubeFilter.Owned]: owned.length,
    [TubeFilter.Wanted]: wanted.length,
    [TubeFilter.Catalogue]: tubes.length - owned.length - wanted.length,
  }

  const openForm = (tube: PaintTube | null, focusName = true) =>
    setForm({
      draft: tube ? draftOf(tube) : emptyDraft(lastGroup),
      editingId: tube?.id ?? null,
      error: null,
      focusName,
    })
  /** A chart click or zone reading fills the open form, or starts a new tube. */
  const updateDraft = (patch: Partial<TubeDraft>) =>
    setForm((f) =>
      f
        ? { ...f, draft: { ...f.draft, ...patch } }
        : { draft: { ...emptyDraft(lastGroup), ...patch }, editingId: null, error: null, focusName: false },
    )

  const submit = () => {
    if (!form) return
    const result = saveDraft(tubes, form.draft, form.editingId)
    if (!result.ok) {
      setForm({ ...form, error: result.error })
      return
    }
    store.update(() => result.tubes)
    setLastGroup(result.group)
    setForm(null)
  }

  const addTube = () => {
    if (tubes.length >= 1000) {
      setForm({
        draft: emptyDraft(lastGroup),
        editingId: null,
        error: DraftError.TooManyTubes,
        focusName: false,
      })
      return
    }
    openForm(null)
  }

  const onImport = (plan: ImportPlan, markOwned: boolean) => {
    store.update(() => plan.next)
    const added = t('imageStudy.paints.added', { count: plan.added })
    setNote(
      (plan.removed
        ? t('imageStudy.paints.importedRemoved', {
            added,
            updated: plan.updated,
            removed: t('imageStudy.paints.removed', { count: plan.removed }),
          })
        : t('imageStudy.paints.imported', { added, updated: plan.updated })) +
        (markOwned ? '' : t('imageStudy.paints.checkOwned')),
    )
    onCharts({ ...charts, open: false })
  }

  const onZoneText = (lines: readonly string[]): string | null => {
    const read = readTubeText(lines)
    if (!(read.name || read.pigment || read.lightfastness || read.opacity)) return null
    updateDraft({
      ...(read.name ? { name: read.name } : {}),
      ...(read.pigment ? { pigment: read.pigment } : {}),
      ...(read.lightfastness ? { lightfastness: read.lightfastness } : {}),
      ...(read.opacity ? { opacity: read.opacity } : {}),
    })
    return [
      read.name,
      read.pigment,
      read.lightfastness ? t('imageStudy.tags.astm', { rating: read.lightfastness }) : '',
      read.opacity ? t(`imageStudy.opacity.${read.opacity}`) : '',
    ]
      .filter(Boolean)
      .join(' · ')
  }

  const count = tubes.length
    ? wanted.length
      ? t('imageStudy.paints.countWanted', {
          tubes: t('imageStudy.paints.tubes', { count: tubes.length }),
          owned: t('imageStudy.paints.owned', { count: owned.length }),
          wanted: wanted.length,
        })
      : t('imageStudy.paints.count', {
          tubes: t('imageStudy.paints.tubes', { count: tubes.length }),
          owned: t('imageStudy.paints.owned', { count: owned.length }),
        })
    : t('imageStudy.paints.noTubes')

  return (
    <div
      className={`grid items-start gap-4 ${wide ? 'grid-cols-1' : 'lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]'}`}
    >
      <section
        className={`flex min-w-0 flex-col gap-3.5 rounded-lg border border-line bg-paper-2 p-4 ${wide ? 'order-2' : ''}`}
      >
        <h2 className="font-semibold">{t('imageStudy.paints.title')}</h2>
        {storageOk ? null : (
          <p role="status" className="rounded-md border border-line px-3 py-2.5 text-sm">
            {t('imageStudy.paints.storageWarning')}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={addTube} className={BUTTON}>
            {t('imageStudy.paints.add')}
          </button>
          <button
            type="button"
            onClick={() => onCharts({ open: true, tab: ChartsTab.Import, group: ALL_GROUPS })}
            className={BUTTON_GHOST}
          >
            {t('imageStudy.paints.charts')}
          </button>
          <span aria-live="polite" className="text-[13px] text-muted">
            {count}
          </span>
        </div>
        {note ? (
          <p role="status" className="rounded-md border border-line px-3 py-2.5 text-sm">
            {note}
          </p>
        ) : null}
        {form ? (
          <TubeForm
            draft={form.draft}
            editing={form.editingId !== null}
            groups={groupNames(tubes, i18n.resolvedLanguage ?? 'en')}
            error={form.error}
            focusName={form.focusName}
            onChange={(draft) => setForm({ ...form, draft })}
            onSubmit={submit}
            onCancel={() => setForm(null)}
          />
        ) : null}
        {tubes.length ? (
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape' && query) {
                  e.preventDefault()
                  setQuery('')
                }
              }}
              placeholder={t('imageStudy.paints.search')}
              aria-label={t('imageStudy.paints.searchLabel')}
              autoComplete="off"
              spellCheck={false}
              enterKeyHint="search"
              className="min-h-10 min-w-0 flex-[1_1_220px] rounded-md border border-line bg-paper-2 px-2.5"
            />
            <Segmented
              label={t('imageStudy.paints.filter')}
              value={filter}
              onChange={setFilter}
              options={Object.values(TubeFilter).map((f) => ({
                value: f,
                label: `${t(`imageStudy.paints.filters.${f}`)} · ${counts[f]}`,
              }))}
            />
            {owned.length ? (
              <button
                type="button"
                onClick={() => copy(listText(t('imageStudy.paints.filters.owned'), owned))}
                className={TOOL_BUTTON}
              >
                {t('imageStudy.paints.copyOwned')}
              </button>
            ) : null}
            {wanted.length ? (
              <button
                type="button"
                onClick={() => copy(listText(t('imageStudy.paints.filters.wanted'), wanted))}
                className={TOOL_BUTTON}
              >
                {t('imageStudy.paints.copyWanted')}
              </button>
            ) : null}
            <span aria-live="polite" className="text-[13px] text-muted">
              {copyMessage}
            </span>
          </div>
        ) : null}
        <TubeList
          tubes={tubes}
          filter={filter}
          query={query}
          options={options}
          onStatus={(ids, status) => store.update((list) => setStatus(list, ids, status))}
          onEdit={(tube) => openForm(tube)}
          onDelete={(tube) => {
            if (!window.confirm(t('imageStudy.paints.deleteConfirm', { name: tube.name }))) return
            store.update((list) => list.filter((x) => x.id !== tube.id))
            if (form?.editingId === tube.id) setForm(null)
          }}
          onExportGroup={(group) => onCharts({ open: true, tab: ChartsTab.Export, group })}
        />
      </section>
      <ManufacturerChart
        key={clearSignal}
        onColour={(rgb) => updateDraft({ hex: rgbToHex(rgb).toLowerCase() })}
        onZoneText={onZoneText}
        wide={wide}
        onWide={setWide}
      />
      <SwatchChartsDialog
        open={charts.open}
        tab={charts.tab}
        group={charts.group}
        tubes={tubes}
        onTab={(tab) => onCharts({ ...charts, tab })}
        onClose={() => onCharts({ ...charts, open: false })}
        onImport={onImport}
      />
    </div>
  )
}
