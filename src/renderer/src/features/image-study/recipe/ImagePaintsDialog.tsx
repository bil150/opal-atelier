import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog } from '@renderer/components/ui/Dialog'
import { Note } from '@renderer/components/ui/Panel'
import { TOOL_BUTTON } from '@renderer/components/ui/buttons'
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
import { formatDeltaE, matchQuality } from './match-quality'
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
        <div
          role="group"
          aria-label={t('imageStudy.imagePaints.proposals')}
          className="flex flex-wrap gap-1.5"
        >
          {result.proposals.map((p, k) => {
            if (p.meanDeltaE === null) return null // nothing owned: no "no purchase" proposal
            const gain = coverageGain(result.proposals, k)
            return (
              <button
                key={p.extraCount}
                type="button"
                aria-pressed={k === pick}
                title={t('imageStudy.imagePaints.meanTitle', { value: formatDeltaE(p.meanDeltaE, locale) })}
                onClick={() => setPicked({ input, k })}
                className={`${TOOL_BUTTON} flex-col items-start py-1.5 text-left`}
              >
                <b>
                  {p.extraCount === 0
                    ? t('imageStudy.imagePaints.noPurchase')
                    : t('imageStudy.imagePaints.plus', { count: p.extraCount })}
                </b>
                <span>
                  ΔE {formatDeltaE(p.meanDeltaE, locale)} ·{' '}
                  {t(`imageStudy.recipe.quality.${matchQuality(p.meanDeltaE)}`)}
                </span>
                <span>
                  {t('imageStudy.imagePaints.faithful', { percent: Math.round(p.coverage * 100) })}
                  {gain ? t('imageStudy.imagePaints.gain', { percent: gain }) : ''}
                </span>
              </button>
            )
          })}
        </div>
        <Note>{t('imageStudy.imagePaints.key')}</Note>
        {lists && mean !== null ? (
          <>
            <QualityMeter deltaE={mean} />
            <p className="text-sm">
              {t('imageStudy.imagePaints.why', {
                value: formatDeltaE(mean, locale),
                quality: t(`imageStudy.recipe.quality.${matchQuality(mean)}`).toLowerCase(),
                percent: Math.round(lists.proposal.coverage * 100),
              })}
            </p>
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
            <Note>
              {t('imageStudy.imagePaints.points', { count: current.points, level: levelLabel(level) })}
            </Note>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => copy(listText())} className={TOOL_BUTTON}>
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
                  className={TOOL_BUTTON}
                >
                  {t('imageStudy.imagePaints.wantAll')}
                </button>
              ) : null}
              <span aria-live="polite" className="text-[13px] text-muted">
                {copyMessage}
              </span>
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
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted">{t('imageStudy.imagePaints.intro')}</p>
        <label className="flex flex-wrap items-center gap-3 text-sm">
          <span>
            {t('imageStudy.imagePaints.precision')} : <b>{levelLabel(level)}</b>
          </span>
          <input
            type="range"
            min={0}
            max={PRECISION_LEVELS.length - 1}
            step={1}
            value={level}
            onChange={(e) => setLevel(Number(e.target.value))}
            className="min-w-40 flex-1"
          />
        </label>
        <fieldset className="m-0 flex flex-wrap gap-x-4 gap-y-1.5 border-0 p-0">
          <legend className="mb-1 text-[13px] font-semibold">
            {t('imageStudy.imagePaints.collections')}
          </legend>
          {collections.length ? (
            collections.map((name) => (
              <label key={name || '-'} className="flex items-center gap-1.5 text-sm">
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
            ))
          ) : (
            <span className="text-sm text-muted">{t('imageStudy.imagePaints.noCollection')}</span>
          )}
        </fieldset>
        {body()}
      </div>
    </Dialog>
  )
}

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
    <section className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold">
        {title} · {tubes.length}
      </h3>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {tubes.map((tube) => {
          const used = Math.round((usage[tube.id] ?? 0) * 100)
          return (
            <li key={tube.id} className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <span className="size-7 rounded-md border border-line" style={{ background: tube.hex }} />
              <span className="font-medium">{tube.name}</span>
              {tube.group ? <span className="text-[12px] text-muted">{tube.group}</span> : null}
              <TubeTags tube={tube} options={options} />
              <span className="text-[12px] text-muted">
                {used < 1
                  ? t('imageStudy.imagePaints.usedForLittle')
                  : t('imageStudy.imagePaints.usedFor', { percent: used })}
              </span>
              <span className="ml-auto flex flex-wrap items-center gap-1.5">
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
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
