import { useTranslation } from 'react-i18next'
import { formatDeltaE, matchQuality, qualityBar, qualityTone } from './match-quality'

const TONE = {
  good: 'text-good',
  neutral: 'text-ink',
  bad: 'text-bad',
} as const

/** ΔE, its verbal rating and a bar (full when identical): same scale everywhere. */
export function QualityMeter({
  deltaE,
  className = '',
}: {
  readonly deltaE: number
  readonly className?: string
}) {
  const { t, i18n } = useTranslation()
  const quality = matchQuality(deltaE)
  return (
    <div className={`flex min-w-0 flex-col gap-1 ${TONE[qualityTone(quality)]} ${className}`}>
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className="font-mono text-xl/none font-bold whitespace-nowrap tabular-nums">
          ΔE {formatDeltaE(deltaE, i18n.resolvedLanguage ?? 'en')}
        </span>
        <span className="text-[13px] font-semibold">{t(`imageStudy.recipe.quality.${quality}`)}</span>
      </div>
      <span aria-hidden="true" className="h-2 overflow-hidden rounded-full bg-line">
        <i className="block h-full bg-current" style={{ width: `${qualityBar(deltaE)}%` }} />
      </span>
    </div>
  )
}
