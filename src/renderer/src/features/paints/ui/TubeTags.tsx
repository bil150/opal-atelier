import { useTranslation } from 'react-i18next'
import { effectiveEffect } from '@renderer/lib/swatch-chart'
import { TubeStatus, type PaintTube } from '../paint-tube'
import { isBlackTube, type CalculationOptions } from '../tube-classification'

const TAG = 'rounded-full border border-line px-2 py-px text-[11px] font-semibold whitespace-nowrap'

/** Small labels next to a tube: left out, effect, to buy, ASTM rating, opacity. */
export function TubeTags({
  tube,
  options,
}: {
  readonly tube: PaintTube
  readonly options: CalculationOptions
}) {
  const { t } = useTranslation()
  const effect = effectiveEffect(tube)
  const blackLeftOut = options.excludeBlacks && isBlackTube(tube)
  const tags: { key: string; text: string; title: string; tone?: string }[] = []

  if (blackLeftOut)
    tags.push({
      key: 'black',
      text: t('imageStudy.tags.blackExcluded'),
      title: t('imageStudy.tags.blackExcludedTitle'),
    })
  if (effect) {
    const name = t(`imageStudy.tags.${effect}`)
    tags.push({
      key: 'effect',
      text: options.excludeEffects ? t('imageStudy.tags.excluded', { effect: name }) : name,
      title: options.excludeEffects
        ? t('imageStudy.tags.effectExcludedTitle')
        : t('imageStudy.tags.effectTitle'),
    })
  }
  if (tube.status === TubeStatus.Wanted)
    tags.push({
      key: 'want',
      text: t('imageStudy.tags.wanted'),
      title: t('imageStudy.tags.wantedTitle'),
      tone: 'border-ink',
    })
  if (tube.lightfastness)
    tags.push({
      key: 'light',
      text: t('imageStudy.tags.astm', { rating: tube.lightfastness }),
      title: t('imageStudy.tags.lightfastnessTitle', {
        rating: tube.lightfastness,
        label: t(`imageStudy.lightfastness.${tube.lightfastness}`),
      }),
    })
  if (tube.opacity) {
    const label = t(`imageStudy.opacity.${tube.opacity}`)
    tags.push({ key: 'opac', text: label, title: t('imageStudy.tags.opacityTitle', { label }) })
  }
  if (!tags.length) return null

  return (
    <span className="mt-0.5 flex flex-wrap gap-1">
      {tags.map((tag) => (
        <span key={tag.key} title={tag.title} className={`${TAG} ${tag.tone ?? ''}`}>
          {tag.text}
        </span>
      ))}
    </span>
  )
}
