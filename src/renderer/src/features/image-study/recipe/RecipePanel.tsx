import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { HoldButton } from '@renderer/components/ui/HoldButton'
import { PARTS_HOLD } from '@renderer/components/ui/hold-profiles'
import { Note, Panel } from '@renderer/components/ui/Panel'
import { BUTTON_GHOST, TOOL_BUTTON } from '@renderer/components/ui/buttons'
import { PaintSelect } from '@renderer/features/paints/PaintSelect'
import { PaintSource, paintOptions } from '@renderer/features/paints/paint-options'
import {
  mixLightfastness,
  tubeLabel,
  type PaintTube,
  type TubeStatus,
} from '@renderer/features/paints/paint-tube'
import type { CalculationOptions } from '@renderer/features/paints/tube-classification'
import { CopyNameButton } from '@renderer/features/paints/ui/CopyButton'
import { TubeTags } from '@renderer/features/paints/ui/TubeTags'
import { toLocale } from '@renderer/i18n/locale'
import type { MixSolution, Rgb } from '@renderer/lib/paint-mixer'
import { rgbCss } from '@renderer/lib/pixels'
import {
  addRow,
  addablePaints,
  nextVariant,
  removeRow,
  setRowParts,
  setRowTube,
  shownRecipe,
  variantsOf,
  type Composition,
} from './composition'
import { QualityMeter } from './QualityMeter'
import { sortByColour } from './match-quality'
import { AdvicePanel } from './AdvicePanel'
import { ADVICE_FROM, MAX_ROW_PARTS, RecipeBlocker, rowsOf, type RecipeState } from './recipe-logic'

const BLOCKER_TEXT = {
  [RecipeBlocker.NoTarget]: 'imageStudy.recipe.pickColour',
  [RecipeBlocker.NoTubes]: 'imageStudy.recipe.addTubes',
  [RecipeBlocker.NoneOwned]: 'imageStudy.recipe.activateTubes',
  [RecipeBlocker.AllBlackOrEffect]: 'imageStudy.recipe.noBlacksNoEffects',
  [RecipeBlocker.AllBlack]: 'imageStudy.recipe.noBlacks',
  [RecipeBlocker.AllEffect]: 'imageStudy.recipe.noEffects',
} as const

interface RecipePanelProps {
  readonly target: Rgb | null
  readonly state: RecipeState
  readonly options: CalculationOptions
  readonly onOpenPaints: () => void
  /** Paints offered as advice (not ticked, not left out). */
  readonly candidates: readonly PaintTube[]
  readonly onStatus: (ids: readonly string[], status: TubeStatus) => void
  readonly onImportChart: () => void
}

/** Which ticked paints, in which parts, give the picked colour; variants and hand edits. */
export function RecipePanel({ target, state, options, onOpenPaints, ...advice }: RecipePanelProps) {
  const { t } = useTranslation()
  if (state.blocker !== null || !target)
    return (
      <Panel title={t('imageStudy.recipe.title')}>
        <p className="text-[13px] text-muted">{t(BLOCKER_TEXT[state.blocker ?? RecipeBlocker.NoTarget])}</p>
        {state.blocker === RecipeBlocker.NoTarget || state.blocker === null ? null : (
          <button type="button" onClick={onOpenPaints} className={`${BUTTON_GHOST} self-start`}>
            {t('imageStudy.recipe.openPaints')}
          </button>
        )}
      </Panel>
    )
  return (
    <Recipe target={target} solution={state.solution} active={state.active} options={options} {...advice} />
  )
}

interface RecipeProps extends Pick<
  RecipePanelProps,
  'candidates' | 'onStatus' | 'onImportChart' | 'options'
> {
  readonly target: Rgb
  readonly solution: MixSolution
  readonly active: readonly PaintTube[]
}

function Recipe({ target, solution, active, options, candidates, onStatus, onImportChart }: RecipeProps) {
  const { t, i18n } = useTranslation()
  const locale = toLocale(i18n.resolvedLanguage)
  // A composition belongs to the solution it was made from: a new colour or new tubes start over.
  const [edit, setEdit] = useState<{ solution: MixSolution; composition: Composition | null }>({
    solution,
    composition: null,
  })
  const [editing, setEditing] = useState(false)
  const composition = edit.solution === solution ? edit.composition : null
  const update = (next: Composition | null) => setEdit({ solution, composition: next })

  const recipe = shownRecipe(solution, composition, target, active)
  const variants = variantsOf(solution).length
  const manual = composition !== null && composition.variant === null
  const variant = composition?.variant ?? 0
  const byId = new Map(active.map((tube) => [tube.id, tube]))
  const used = recipe.items.flatMap((it) => byId.get(it.id) ?? [])
  const light = mixLightfastness(used)
  const rows = composition?.rows ?? rowsOf(recipe)

  const options_ = useMemo(() => paintOptions(PaintSource.Inventory, locale, active), [locale, active])
  const sorted = (ids: ReadonlySet<string>) =>
    sortByColour(
      options_.filter((o) => ids.has(o.id)),
      locale,
    )

  return (
    <>
      <Panel title={t('imageStudy.recipe.title')}>
        <div className="flex items-center gap-1.5">
          <figure className="m-0 flex flex-col items-center gap-0.5">
            <span
              role="img"
              aria-label={t('imageStudy.recipe.targetLabel')}
              className="size-14 rounded-lg border border-line"
              style={{ background: rgbCss(target) }}
            />
            <figcaption className="text-[11px] text-muted">{t('imageStudy.recipe.target')}</figcaption>
          </figure>
          <figure className="m-0 flex flex-col items-center gap-0.5">
            <span
              role="img"
              aria-label={t('imageStudy.recipe.mixLabel')}
              className="size-14 rounded-lg border border-line"
              style={{ background: rgbCss(recipe.mixRgb) }}
            />
            <figcaption className="text-[11px] text-muted">{t('imageStudy.recipe.mix')}</figcaption>
          </figure>
          <QualityMeter deltaE={recipe.deltaE} className="ml-1.5 flex-1 self-start pt-2" />
        </div>
        {light ? (
          <span
            title={
              t('imageStudy.recipe.lightfastnessTitle', {
                label: t(`imageStudy.lightfastness.${light.worst}`),
              }) + (light.partial ? t('imageStudy.recipe.lightfastnessPartial') : '')
            }
            className="self-start rounded-full border border-line px-2 py-px text-[11px] font-semibold"
          >
            {t('imageStudy.recipe.lightfastness', { rating: light.worst })}
            {light.partial ? ' *' : ''}
          </span>
        ) : null}

        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {recipe.items.map((item, i) => {
            const tube = byId.get(item.id)
            if (!tube) return null
            const percent = Math.round(item.weight * 100)
            const row = rows[i]
            return (
              <li key={item.id} className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3 gap-y-1.5">
                <span
                  className="mt-0.5 size-8 rounded-md border border-line"
                  style={{ background: tube.hex }}
                />
                {editing && row ? (
                  <div className="flex min-w-0 items-center gap-1.5">
                    <div className="min-w-0 flex-1">
                      <PaintSelect
                        label={t('imageStudy.recipe.row', { n: i + 1 })}
                        value={options_.find((o) => o.id === row.id) ?? null}
                        options={sorted(
                          new Set(
                            active
                              .filter((a) => a.id === row.id || !rows.some((r) => r.id === a.id))
                              .map((a) => a.id),
                          ),
                        )}
                        source={PaintSource.Inventory}
                        onChange={(id) => update(setRowTube(solution, composition, i, id))}
                        emptyText=""
                      />
                    </div>
                    <button
                      type="button"
                      aria-label={t('imageStudy.recipe.remove', { name: tube.name })}
                      disabled={rows.length < 2}
                      onClick={() => update(removeRow(solution, composition, i))}
                      className={`${TOOL_BUTTON} min-w-9 px-0`}
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="text-base/tight font-bold">{tube.name}</span>
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted">
                      {tube.group ? <span>{tube.group}</span> : null}
                      <TubeTags tube={tube} options={options} />
                      <CopyNameButton text={tubeLabel(tube)} />
                    </span>
                  </div>
                )}
                <div className="col-start-2 flex items-center gap-2 text-[13px]">
                  {editing && row ? (
                    <span className="flex items-center gap-1">
                      <HoldButton
                        profile={PARTS_HOLD}
                        aria-label={t('imageStudy.recipe.fewerParts')}
                        disabled={row.parts <= 1}
                        onStep={(m) => {
                          if (row.parts <= 1) return false
                          update(setRowParts(solution, composition, i, row.parts - m))
                          return true
                        }}
                        className={`${TOOL_BUTTON} min-w-8 px-0`}
                      >
                        −
                      </HoldButton>
                      <input
                        type="number"
                        min={1}
                        max={MAX_ROW_PARTS}
                        inputMode="numeric"
                        value={row.parts}
                        aria-label={t('imageStudy.recipe.partsOf', { name: tube.name })}
                        onChange={(e) => {
                          if (e.target.value !== '')
                            update(setRowParts(solution, composition, i, Number(e.target.value)))
                        }}
                        className="h-8 w-12 rounded-md border border-line bg-paper-2 text-center tabular-nums"
                      />
                      <HoldButton
                        profile={PARTS_HOLD}
                        aria-label={t('imageStudy.recipe.moreParts')}
                        disabled={row.parts >= MAX_ROW_PARTS}
                        onStep={(m) => {
                          if (row.parts >= MAX_ROW_PARTS) return false
                          update(setRowParts(solution, composition, i, row.parts + m))
                          return true
                        }}
                        className={`${TOOL_BUTTON} min-w-8 px-0`}
                      >
                        +
                      </HoldButton>
                    </span>
                  ) : null}
                  <span aria-hidden="true" className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
                    <i className="block h-full bg-ink" style={{ width: `${percent}%` }} />
                  </span>
                  <span className="w-11 text-right tabular-nums">{percent} %</span>
                  {!editing && recipe.parts && recipe.items.length > 1 ? (
                    <span className="w-16 text-right text-muted tabular-nums">
                      {t('imageStudy.recipe.parts', { count: recipe.parts[i] ?? 1 })}
                    </span>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ul>

        {editing ? (
          <div className="flex flex-wrap items-center gap-2">
            {addablePaints(active, rows).length ? (
              <div className="min-w-0 flex-1">
                <PaintSelect
                  label={t('imageStudy.recipe.addPaintLabel')}
                  value={null}
                  options={sorted(new Set(addablePaints(active, rows).map((a) => a.id)))}
                  source={PaintSource.Inventory}
                  onChange={(id) => update(addRow(solution, composition, id))}
                  emptyText={t('imageStudy.recipe.addPaint')}
                />
              </div>
            ) : null}
            <button
              type="button"
              disabled={!composition}
              onClick={() => update(null)}
              className={TOOL_BUTTON}
            >
              {t('imageStudy.recipe.reset')}
            </button>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[12px] text-muted">
            {manual
              ? t('imageStudy.recipe.modified')
              : variants > 1
                ? t('imageStudy.recipe.count', { n: variant + 1, total: variants })
                : ''}
          </span>
          <button
            type="button"
            disabled={variants < 2}
            title={
              variants < 2
                ? t('imageStudy.recipe.nextNone')
                : t('imageStudy.recipe.nextTitle', { n: variant + 1, total: variants })
            }
            onClick={() => update(nextVariant(solution, composition))}
            className={TOOL_BUTTON}
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="size-4 fill-none stroke-current stroke-2 [stroke-linecap:round] [stroke-linejoin:round]"
            >
              <path d="M21 12a9 9 0 1 1-3-6.7" />
              <path d="M21 4v5h-5" />
            </svg>
            {t('imageStudy.recipe.next')}
          </button>
          <button
            type="button"
            aria-expanded={editing}
            title={editing ? t('imageStudy.recipe.doneTitle') : t('imageStudy.recipe.editTitle')}
            onClick={() => setEditing(!editing)}
            className={TOOL_BUTTON}
          >
            {editing ? (
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="size-4 fill-none stroke-current stroke-2 [stroke-linecap:round] [stroke-linejoin:round]"
              >
                <path d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="size-4 fill-none stroke-current stroke-2 [stroke-linecap:round] [stroke-linejoin:round]"
              >
                <path d="M4 20h4L19 9l-4-4L4 16z" />
                <path d="M13.5 6.5l4 4" />
              </svg>
            )}
            {editing ? t('imageStudy.recipe.done') : t('imageStudy.recipe.edit')}
          </button>
        </div>
        <Note>{t('imageStudy.recipe.note')}</Note>
      </Panel>
      {recipe.deltaE >= ADVICE_FROM ? (
        <AdvicePanel
          target={target}
          base={recipe}
          active={active}
          candidates={candidates}
          options={options}
          onStatus={onStatus}
          onImportChart={onImportChart}
        />
      ) : null}
    </>
  )
}
