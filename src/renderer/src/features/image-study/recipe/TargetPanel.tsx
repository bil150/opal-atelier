import { useTranslation } from 'react-i18next'
import { Note, Panel } from '@renderer/components/ui/Panel'
import type { Rgb } from '@renderer/lib/paint-mixer'
import { rgbCss, rgbToHex, toCmy, toCmyk } from '@renderer/lib/pixels'

interface TargetPanelProps {
  readonly target: Rgb | null
  readonly point: { readonly x: number; readonly y: number } | null
}

const percent = (v: number) => `${Math.round(v * 100)} %`

/** The picked colour: swatch and its values. */
export function TargetPanel({ target, point }: TargetPanelProps) {
  const { t } = useTranslation()
  if (!target || !point)
    return (
      <Panel title={t('imageStudy.target.title')}>
        <p className="text-[13px] text-muted">{t('imageStudy.target.empty')}</p>
      </Panel>
    )
  const cmy = toCmy(target)
  const cmyk = toCmyk(target)
  const rows: readonly (readonly [string, string])[] = [
    ['HEX', rgbToHex(target)],
    ['RGB', `${target.r}, ${target.g}, ${target.b}`],
    ['CMY', cmy.map(percent).join(', ')],
    ['CMYK', cmyk.map(percent).join(', ')],
    [t('imageStudy.target.pixel'), `${point.x}, ${point.y}`],
  ]
  return (
    <Panel title={t('imageStudy.target.title')}>
      <div className="flex items-start gap-3">
        <span
          role="img"
          aria-label={t('imageStudy.target.swatch')}
          className="size-16 flex-none rounded-lg border border-line"
          style={{ background: rgbCss(target) }}
        />
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[13px]">
          {rows.map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-muted">{label}</dt>
              <dd className="font-mono tabular-nums select-all">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
      <Note>{t('imageStudy.target.note')}</Note>
    </Panel>
  )
}
