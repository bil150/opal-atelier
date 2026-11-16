import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Note, Panel } from '@renderer/components/ui/Panel'
import { usePhone } from '@renderer/components/ui/panel-collapse'
import { BUTTON_GHOST, TOOL_BUTTON } from '@renderer/components/ui/buttons'
import { TubeStatus, tubeLabel, type PaintTube } from '@renderer/features/paints/paint-tube'
import type { CalculationOptions } from '@renderer/features/paints/tube-classification'
import { CopyNameButton } from '@renderer/features/paints/ui/CopyButton'
import { TubeTags } from '@renderer/features/paints/ui/TubeTags'
import type { MixRecipe, Rgb } from '@renderer/lib/paint-mixer'
import { formatDeltaE } from './match-quality'
import { searchAdvice, type Advice } from './recipe-logic'

interface AdvicePanelProps {
  readonly target: Rgb
  /** The recipe shown: advice improves on it. */
  readonly base: MixRecipe
  readonly active: readonly PaintTube[]
  readonly candidates: readonly PaintTube[]
  readonly options: CalculationOptions
  readonly onStatus: (ids: readonly string[], status: TubeStatus) => void
  readonly onImportChart: () => void
}

interface Search {
  /** The recipe this search belongs to (a newer recipe makes it stale). */
  readonly base: MixRecipe
  readonly progress: number
  readonly found: readonly Advice[] | null
}

/** Time slice of the search before letting the page breathe. */
const SLICE_MS = 12

/**
 * Advice, shown when the recipe is not close enough: closed, nothing is computed. Open, the paints of the
 * charts not ticked are tried one by one, added to the ticked ones; the best few are listed.
 */
export function AdvicePanel({
  target,
  base,
  active,
  candidates,
  options,
  onStatus,
  onImportChart,
}: AdvicePanelProps) {
  const { t, i18n } = useTranslation()
  const locale = i18n.resolvedLanguage ?? 'en'
  const [open, setOpen] = useState(false)
  // Folded on a phone until opened (nothing is searched meanwhile); always open on a large screen.
  const phone = usePhone()
  const searching = !phone || open
  const [search, setSearch] = useState<Search | null>(null)

  useEffect(() => {
    if (!searching || !candidates.length) return
    const run = searchAdvice(target, base, active, candidates)
    let timer = 0
    const step = () => {
      const until = performance.now() + SLICE_MS
      for (;;) {
        const next = run.next()
        if (next.done) {
          setSearch({ base, progress: 1, found: next.value })
          return
        }
        if (performance.now() > until) {
          setSearch({ base, progress: next.value, found: null })
          break
        }
      }
      timer = window.setTimeout(step, 0)
    }
    timer = window.setTimeout(step, 0)
    return () => clearTimeout(timer) // closed, or the colour changed: this search is stale
  }, [searching, target, base, active, candidates])

  const current = search?.base === base ? search : null
  const byId = new Map([...active, ...candidates].map((tube) => [tube.id, tube]))
  const first = current?.found?.[0]
  const from = formatDeltaE(base.deltaE, locale)

  const teaser = !candidates.length
    ? t('imageStudy.advice.import')
    : !searching
      ? ''
      : !current?.found
        ? current?.progress
          ? t('imageStudy.advice.progress', { percent: Math.round(current.progress * 100) })
          : t('imageStudy.advice.searching')
        : first
          ? t('imageStudy.advice.best', {
              name: tubeLabel(first.tube),
              from,
              to: formatDeltaE(first.recipe.deltaE, locale),
            })
          : t('imageStudy.advice.none')

  return (
    // Folded at first, like the other panels can be: nothing is searched until it is unfolded.
    <Panel title={t('imageStudy.advice.title')} defaultOpen={false} onToggle={setOpen}>
      <div className="flex flex-col gap-2.5">
        <p aria-live="polite" className="text-[13px]">
          {teaser}
        </p>
        {!candidates.length ? (
          <>
            <p className="text-[13px] text-muted">{t('imageStudy.advice.importHelp')}</p>
            <button type="button" onClick={onImportChart} className={`${BUTTON_GHOST} self-start`}>
              {t('imageStudy.paints.charts')}
            </button>
          </>
        ) : null}
        {current?.found?.length ? (
          <>
            <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
              {current.found.map(({ tube, recipe }) => (
                <li key={tube.id} className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-2.5 gap-y-1">
                  <span className="size-7 rounded-md border border-line" style={{ background: tube.hex }} />
                  <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-medium">{tube.name}</span>
                    {tube.group ? <span className="text-[12px] text-muted">{tube.group}</span> : null}
                    <TubeTags tube={tube} options={options} />
                    <span className="ml-auto text-[13px] tabular-nums">
                      <b>ΔE {formatDeltaE(recipe.deltaE, locale)}</b>{' '}
                      <span className="text-muted">−{formatDeltaE(base.deltaE - recipe.deltaE, locale)}</span>
                    </span>
                  </div>
                  <p className="col-start-2 m-0 text-[12px] text-muted">
                    {recipe.items
                      .map((it) => `${byId.get(it.id)?.name ?? '?'} ${Math.round(it.weight * 100)} %`)
                      .join(' · ')}
                  </p>
                  <div className="col-start-2 flex flex-wrap items-center gap-1.5">
                    <CopyNameButton text={tubeLabel(tube)} />
                    <button
                      type="button"
                      aria-label={t('imageStudy.actions.addInventoryLabel', { name: tubeLabel(tube) })}
                      onClick={() => onStatus([tube.id], TubeStatus.Owned)}
                      className={TOOL_BUTTON}
                    >
                      {t('imageStudy.actions.addInventory')}
                    </button>
                    {tube.status === TubeStatus.Wanted ? null : (
                      <button
                        type="button"
                        aria-label={t('imageStudy.actions.addShoppingLabel', { name: tubeLabel(tube) })}
                        onClick={() => onStatus([tube.id], TubeStatus.Wanted)}
                        className={TOOL_BUTTON}
                      >
                        {t('imageStudy.actions.addShopping')}
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            <Note>{t('imageStudy.advice.note')}</Note>
          </>
        ) : null}
      </div>
    </Panel>
  )
}
