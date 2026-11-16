import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog } from '@renderer/components/ui/Dialog'
import { Note } from '@renderer/components/ui/Panel'
import { BUTTON_GHOST, TOOL_BUTTON } from '@renderer/components/ui/buttons'
import { TubeStatus, type PaintTube } from '@renderer/features/paints/paint-tube'
import type { CalculationOptions } from '@renderer/features/paints/tube-classification'
import { CopyNameButton } from '@renderer/features/paints/ui/CopyButton'
import { TubeTags } from '@renderer/features/paints/ui/TubeTags'
import { useCopyMessage } from '@renderer/features/paints/use-copy-message'
import { tubeLabel } from '@renderer/features/paints/paint-tube'
import type { PaintProposals } from '@renderer/lib/paint-mixer'
import { smallPixels, type ReferenceImage } from '../view/reference-image'
import { QualityMeter } from './QualityMeter'
import {
  collectionNames,
  coverageGain,
  imagePaintPool,
  imageTargets,
  paintLine,
  proposalLists,
  proposeImagePaints,
  sampleSide,
} from './image-paints'
import { formatDeltaE, matchQuality, qualityTone } from './match-quality'
import { PRECISION_LEVELS, preferredProposal } from './recipe-logic'

interface ImagePaintsDialogProps {
  readonly open: boolean
  readonly onClose: () => void
  readonly image: ReferenceImage | null
  readonly tubes: readonly PaintTube[]
  readonly options: CalculationOptions
  readonly onStatus: (ids: readonly string[], status: TubeStatus) => void
}

const DEFAULT_LEVEL = 2

interface Computation {
  readonly input: object
  readonly result: PaintProposals
  readonly points: number
}

/** Which paints reproduce the whole image: those owned, then those worth buying, as proposals. */
export function ImagePaintsDialog({
  open,
  onClose,
  image,
  tubes,
  options,
  onStatus,
}: ImagePaintsDialogProps) {
  const { t, i18n } = useTranslation()
  const locale = i18n.resolvedLanguage ?? 'en'
  const [level, setLevel] = useState(DEFAULT_LEVEL)
  const [unticked, setUnticked] = useState<ReadonlySet<string>>(new Set())
  const [computed, setComputed] = useState<Computation | null>(null)
  const [picked, setPicked] = useState<{ input: object; k: number } | null>(null)
  const [copyMessage, copy] = useCopyMessage()

  const collections = collectionNames(tubes, locale)
  const pool = useMemo(() => imagePaintPool(tubes, unticked, options), [tubes, unticked, options])
  const input = useMemo(() => ({ image, level, pool }), [image, level, pool])

  useEffect(() => {
    if (!open || !image || !pool.length) return
    // A pause first, so "Calculating…" shows; a newer input cancels this one.
    const timer = window.setTimeout(() => {
      const pixels = smallPixels(image, sampleSide(level))
      if (!pixels) return
      const targets = imageTargets(pixels, level)
      setComputed({ input, result: proposeImagePaints(targets, pool), points: targets.length })
    }, 30)
    return () => clearTimeout(timer)
  }, [open, image, level, pool, input])

  const current = computed?.input === input ? computed : null
  const pick = current
    ? picked?.input === input
      ? picked.k
      : preferredProposal(current.result.proposals)
    : 0
  const lists = current ? proposalLists(current.result, pick, tubes) : null
  const levelLabel = (k: number) => {
    const n = PRECISION_LEVELS[k]
    return n === null || n === undefined
      ? t('imageStudy.imagePaints.levels.all')
      : t('imageStudy.imagePaints.levels.colours', { count: n })
  }

  const listText = () => {
    if (lists?.proposal.meanDeltaE == null) return ''
    const mean = lists.proposal.meanDeltaE
    return [
      t('imageStudy.imagePaints.textTitle', {
        name: image ? ` — ${image.name}` : '',
        value: formatDeltaE(mean, locale),
        quality: t(`imageStudy.recipe.quality.${matchQuality(mean)}`),
        percent: Math.round(lists.proposal.coverage * 100),
      }),
      '',
      `${t('imageStudy.imagePaints.owned')} (${lists.owned.length})`,
      ...lists.owned.map(paintLine),
      '',
      `${t('imageStudy.imagePaints.toBuy')} (${lists.toBuy.length})`,
      ...lists.toBuy.map(paintLine),
    ].join('\n')
  }

  const body = () => {
    if (!image) return <p className="text-muted">{t('imageStudy.imagePaints.noImage')}</p>
    if (!pool.length)
      return (
        <p className="text-muted">
          {tubes.length ? t('imageStudy.imagePaints.checkCollection') : t('imageStudy.imagePaints.noPaints')}
        </p>
      )
    if (!current) return <p className="text-muted">{t('imageStudy.imagePaints.computing')}</p>
    const { result } = current
    if (!result.owned.length && !result.toBuy.length)
      return <p className="text-muted">{t('imageStudy.imagePaints.nothing')}</p>
    const mean = lists?.proposal.meanDeltaE ?? null
    return (
      <>
        <section className="flex flex-col gap-2.5">
          <h3 className={SECTION_TITLE}>{t('imageStudy.imagePaints.proposals')}</h3>
          <div
            role="group"
            aria-label={t('imageStudy.imagePaints.proposals')}
            className="grid grid-cols-[repeat(auto-fill,minmax(132px,1fr))] gap-2"
          >
            {result.proposals.map((p, k) => {
              if (p.meanDeltaE === null) return null // nothing owned: no "no purchase" proposal
              const gain = coverageGain(result.proposals, k)
              const quality = matchQuality(p.meanDeltaE)
              return (
                <button
                  key={p.extraCount}
                  type="button"
                  aria-pressed={k === pick}
                  title={t('imageStudy.imagePaints.meanTitle', { value: formatDeltaE(p.meanDeltaE, locale) })}
                  onClick={() => setPicked({ input, k })}
                  className="flex flex-col items-start gap-1 rounded-xl border border-line bg-paper-2 p-3 text-left hover:border-ink aria-pressed:border-ink aria-pressed:shadow-[inset_0_0_0_1.5px_var(--color-ink)]"
                >
                  <b className="text-base">
                    {p.extraCount === 0
                      ? t('imageStudy.imagePaints.noPurchase')
                      : t('imageStudy.imagePaints.plus', { count: p.extraCount })}
                  </b>
                  <span className={`text-sm font-semibold ${QUALITY_TEXT[qualityTone(quality)]}`}>
                    ΔE {formatDeltaE(p.meanDeltaE, locale)} · {t(`imageStudy.recipe.quality.${quality}`)}
                  </span>
                  <span className="text-[13px] text-muted">
                    {t('imageStudy.imagePaints.faithful', { percent: Math.round(p.coverage * 100) })}
                    {gain ? t('imageStudy.imagePaints.gain', { percent: gain }) : ''}
                  </span>
                </button>
              )
            })}
          </div>
          <Note>{t('imageStudy.imagePaints.key')}</Note>
        </section>

        {lists && mean !== null ? (
          <>
            <section className="flex flex-col gap-2.5 rounded-xl border border-line bg-paper-2 p-4">
              <QualityMeter deltaE={mean} />
              <p className="text-sm/relaxed text-muted">
                {t('imageStudy.imagePaints.why', {
                  value: formatDeltaE(mean, locale),
                  quality: t(`imageStudy.recipe.quality.${matchQuality(mean)}`).toLowerCase(),
                  percent: Math.round(lists.proposal.coverage * 100),
                })}
              </p>
            </section>

            <PaintList
              title={t('imageStudy.imagePaints.owned')}
              tubes={lists.owned}
              usage={lists.proposal.usage}
              options={options}
            />
            <PaintList
              title={t('imageStudy.imagePaints.toBuy')}
              tubes={lists.toBuy}
              usage={lists.proposal.usage}
              options={options}
              onStatus={onStatus}
            />
            {!lists.toBuy.length && lists.proposal.extraCount === 0 ? (
              <Note>{t('imageStudy.imagePaints.nothingToBuy')}</Note>
            ) : null}

            <div className="flex flex-col gap-3 border-t border-line pt-4">
              <Note>
                {t('imageStudy.imagePaints.points', { count: current.points, level: levelLabel(level) })}
              </Note>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => copy(listText())} className={BUTTON_GHOST}>
                  {t('imageStudy.imagePaints.copyAll')}
                </button>
                {lists.toBuy.some((tube) => tube.status === TubeStatus.Catalogue) ? (
                  <button
                    type="button"
                    onClick={() =>
                      onStatus(
                        lists.toBuy
                          .filter((tube) => tube.status === TubeStatus.Catalogue)
                          .map((tube) => tube.id),
                        TubeStatus.Wanted,
                      )
                    }
                    className={BUTTON_GHOST}
                  >
                    {t('imageStudy.imagePaints.wantAll')}
                  </button>
                ) : null}
                <span aria-live="polite" className="text-[13px] text-muted">
                  {copyMessage}
                </span>
              </div>
            </div>
          </>
        ) : null}
      </>
    )
  }

  return (
    <Dialog
      open={open}
      title={t('imageStudy.imagePaints.title')}
      closeLabel={t('imageStudy.charts.close')}
      onClose={onClose}
    >
      <div className="flex flex-col gap-5">
        <p className="text-sm text-muted">{t('imageStudy.imagePaints.intro')}</p>

        <section className="flex flex-col gap-4 rounded-xl border border-line bg-paper-2 p-4">
          <label className="flex flex-col gap-2 text-sm">
            <span className="flex items-baseline justify-between gap-3">
              <span className={SECTION_TITLE}>{t('imageStudy.imagePaints.precision')}</span>
              <b>{levelLabel(level)}</b>
            </span>
            <input
              type="range"
              min={0}
              max={PRECISION_LEVELS.length - 1}
              step={1}
              value={level}
              onChange={(e) => setLevel(Number(e.target.value))}
            />
          </label>
          <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
            <legend className={`${SECTION_TITLE} mb-2`}>{t('imageStudy.imagePaints.collections')}</legend>
            {collections.length ? (
              <div className="flex flex-wrap gap-2">
                {collections.map((name) => (
                  <label
                    key={name || '-'}
                    className="flex cursor-pointer items-center gap-2 rounded-full border border-line px-3 py-1.5 text-sm has-checked:border-ink has-checked:bg-highlight"
                  >
                    <input
                      type="checkbox"
                      checked={!unticked.has(name)}
                      onChange={(e) => {
                        const next = new Set(unticked)
                        if (e.target.checked) next.delete(name)
                        else next.add(name)
                        setUnticked(next)
                      }}
                    />
                    {name || t('imageStudy.paints.noGroup')}
                  </label>
                ))}
              </div>
            ) : (
              <span className="text-sm text-muted">{t('imageStudy.imagePaints.noCollection')}</span>
            )}
          </fieldset>
        </section>

        {body()}
      </div>
    </Dialog>
  )
}

const SECTION_TITLE = 'text-[13px] font-semibold tracking-wide text-muted uppercase'
const QUALITY_TEXT = { good: 'text-good', neutral: 'text-ink', bad: 'text-bad' } as const

interface PaintListProps {
  readonly title: string
  readonly tubes: readonly PaintTube[]
  readonly usage: Readonly<Record<string, number>>
  readonly options: CalculationOptions
  /** Only for paints to buy: add to the inventory or to the shopping list. */
  readonly onStatus?: (ids: readonly string[], status: TubeStatus) => void
}

function PaintList({ title, tubes, usage, options, onStatus }: PaintListProps) {
  const { t } = useTranslation()
  if (!tubes.length) return null
  return (
    <section className="flex flex-col gap-2.5">
      <h3 className={`${SECTION_TITLE} flex items-center gap-2`}>
        {title}
        <span className="rounded-full bg-highlight px-2 py-px text-[12px] text-ink">{tubes.length}</span>
      </h3>
      <ul className="m-0 grid list-none grid-cols-1 gap-2 p-0 sm:grid-cols-2">
        {tubes.map((tube) => {
          const share = usage[tube.id] ?? 0
          const used = Math.round(share * 100)
          return (
            <li
              key={tube.id}
              className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2.5 rounded-xl border border-line bg-paper-2 p-3"
            >
              <span
                className="mt-0.5 size-9 rounded-lg border border-line"
                style={{ background: tube.hex }}
              />
              <div className="flex min-w-0 flex-col gap-1">
                <span className="leading-tight font-semibold">{tube.name}</span>
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-muted">
                  {tube.group ? <span>{tube.group}</span> : null}
                  <TubeTags tube={tube} options={options} />
                </span>
              </div>
              <div className="col-span-2 flex items-center gap-2.5">
                <span aria-hidden="true" className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
                  <i className="block h-full bg-ink" style={{ width: `${Math.max(2, used)}%` }} />
                </span>
                <span className="text-[12px] whitespace-nowrap text-muted">
                  {used < 1
                    ? t('imageStudy.imagePaints.usedForLittle')
                    : t('imageStudy.imagePaints.usedFor', { percent: used })}
                </span>
              </div>
              <div className="col-span-2 flex flex-wrap items-center gap-1.5">
                <CopyNameButton text={tubeLabel(tube)} />
                {onStatus && tube.status !== TubeStatus.Owned ? (
                  <button
                    type="button"
                    aria-label={t('imageStudy.actions.addInventoryLabel', { name: tubeLabel(tube) })}
                    onClick={() => onStatus([tube.id], TubeStatus.Owned)}
                    className={TOOL_BUTTON}
                  >
                    {t('imageStudy.actions.addInventory')}
                  </button>
                ) : null}
                {onStatus && tube.status === TubeStatus.Catalogue ? (
                  <button
                    type="button"
                    aria-label={t('imageStudy.actions.addShoppingLabel', { name: tubeLabel(tube) })}
                    onClick={() => onStatus([tube.id], TubeStatus.Wanted)}
                    className={TOOL_BUTTON}
                  >
                    {t('imageStudy.actions.addShopping')}
                  </button>
                ) : null}
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
