import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Dashboard, Toolbar } from '@renderer/components/studio/Dashboard'
import type { StudioLayout } from '@renderer/components/studio/studio-options'
import { ModeTabs } from '@renderer/components/ui/ModeTabs'
import { Note, Panel } from '@renderer/components/ui/Panel'
import { GreyIcon, Segmented, ToggleButton } from '@renderer/components/ui/Segmented'
import { PaintSelect } from '@renderer/features/paints/PaintSelect'
import { PaintSource, paintOptions, type PaintOption } from '@renderer/features/paints/paint-options'
import { useTubes } from '@renderer/features/paints/tube-store'
import { useStoredSettings } from '@renderer/hooks/use-local-storage'
import { toLocale } from '@renderer/i18n/locale'
import {
  ADDITION_DOSES,
  TemperatureAction,
  additionRatio,
  chooseAgent,
  cssColor,
  greyingDoses,
  hexToRgb01,
  mixPaints,
  temperatureOf,
  toGrey,
  warmth,
  type Rgb01,
} from '@renderer/lib/color-theory'
import {
  DEFAULT_TEMPERATURE_PAINT,
  MIX_SETTINGS_KEY,
  sanitizeMix,
  sanitizeTemperature,
} from '../color-settings'

const ACTION_ICONS: Readonly<Record<TemperatureAction, React.ReactNode>> = {
  [TemperatureAction.Warm]: (
    <path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2.4 1.2-3.8 2.4-5 .2 1.6.9 2.6 2 3 0-3 0-5.5.6-8z" />
  ),
  [TemperatureAction.Cool]: (
    <path d="M12 2v20M4.5 6.5l15 11M19.5 6.5l-15 11M9 3.5l3 2.5 3-2.5M9 20.5l3-2.5 3 2.5" />
  ),
  [TemperatureAction.Grey]: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="currentColor" />
    </>
  ),
}

function Term({
  color,
  title,
  subtitle,
  result = false,
}: {
  readonly color: string
  readonly title: string
  readonly subtitle?: string
  readonly result?: boolean
}) {
  return (
    <div
      className={`flex flex-col items-center gap-1.5 text-center ${result ? 'w-[104px] sm:w-[150px]' : 'w-[84px] sm:w-[110px]'}`}
    >
      <span
        className={`border border-line transition-colors duration-150 ${result ? 'size-24 rounded-2xl sm:size-[140px]' : 'size-16 rounded-xl sm:size-[88px]'}`}
        style={{ background: color }}
      />
      <span className="text-[15px] font-bold">{title}</span>
      {subtitle ? <small className="text-xs/tight opacity-70">{subtitle}</small> : null}
    </div>
  )
}

const Operator = ({ sign }: { readonly sign: string }) => (
  <span
    aria-hidden="true"
    className="mt-5 text-[22px] leading-none font-bold opacity-55 sm:mt-[30px] sm:text-[28px]"
  >
    {sign}
  </span>
)

/** Warm up, cool down or grey a colour by adding a neighbouring paint or its complementary. */
export function TemperatureView({ layout }: { readonly layout: StudioLayout }) {
  const { t, i18n } = useTranslation()
  const locale = toLocale(i18n.resolvedLanguage)
  const inventory = useTubes().tubes
  const [mix, updateMix] = useStoredSettings(MIX_SETTINGS_KEY, sanitizeMix)
  const [settings, update] = useStoredSettings('color:temperature', sanitizeTemperature)
  const [grey, setGrey] = useState(false)
  const shown = (c: Rgb01) => cssColor(grey ? toGrey(c) : c)

  const options = useMemo(() => paintOptions(mix.source, locale, inventory), [mix.source, locale, inventory])
  const base: PaintOption | null =
    options.find((o) => o.id === settings.paintId) ??
    options.find((o) => o.id === DEFAULT_TEMPERATURE_PAINT) ??
    options[0] ??
    null
  const action = settings.action
  const choice = base ? chooseAgent(action, base, options) : null
  const agent = choice?.agent ?? null
  const shares =
    base && agent
      ? action === TemperatureAction.Grey
        ? greyingDoses(base.hex, agent.hex)
        : ADDITION_DOSES
      : []
  const dose = Math.max(0, Math.min(shares.length - 1, settings.dose))
  const mixAt = (f: number) =>
    base && agent ? mixPaints([base.hex, agent.hex], [1 - f, f]) : hexToRgb01('#808080')
  const partsText = (n: number) => t('color.mix.parts', { count: n })

  const baseColor = base ? hexToRgb01(base.hex) : null
  const share = shares[dose] ?? 0
  const result = agent ? mixAt(share) : baseColor
  const ratio = additionRatio(share)
  const verb = t(`color.temperature.verbs.${action}`)

  const gaugePosition = (c: Rgb01) => `${(((warmth(c) + 1) / 2) * 100).toFixed(1)}%`
  const kind = (c: Rgb01) => t(`color.temperature.kinds.${temperatureOf(c)}`)
  const kindText =
    baseColor && result
      ? kind(baseColor) === kind(result)
        ? kind(baseColor)
        : `${kind(baseColor)} → ${kind(result)}`
      : '—'

  const stage = (
    <>
      <ModeTabs
        label={t('color.temperature.actions')}
        value={action}
        onChange={(a) => update((s) => ({ ...s, action: a }))}
        options={Object.values(TemperatureAction).map((a) => ({
          value: a,
          title: t(`color.temperature.${a}`),
          subtitle: t(`color.temperature.${a}Sub`),
          icon: ACTION_ICONS[a],
        }))}
      />
      <div className="flex flex-col justify-center gap-[22px] rounded-lg border border-line bg-paper px-4 py-5">
        <div className="flex flex-wrap items-start justify-center gap-x-3.5 gap-y-2">
          {base && baseColor && agent && result ? (
            <>
              <Term color={shown(baseColor)} title={partsText(ratio[0] ?? 1)} subtitle={base.name} />
              <Operator sign="+" />
              <Term
                color={shown(hexToRgb01(agent.hex))}
                title={partsText(ratio[1] ?? 0)}
                subtitle={agent.name}
              />
              <Operator sign="=" />
              <Term color={shown(result)} title={t('color.temperature.result')} result />
            </>
          ) : base && baseColor ? (
            <Term color={shown(baseColor)} title={base.name} result />
          ) : null}
        </div>
        <div className="mx-auto w-[min(520px,100%)]">
          {agent && base ? (
            <div
              role="radiogroup"
              aria-label={t('color.temperature.dose')}
              className="grid grid-cols-5 gap-1.5"
            >
              {shares.map((f, k) => {
                const r = additionRatio(f)
                return (
                  <button
                    key={k}
                    type="button"
                    role="radio"
                    aria-checked={k === dose}
                    aria-label={t('color.temperature.step', {
                      added: partsText(r[1] ?? 0),
                      agent: agent.name,
                      base: partsText(r[0] ?? 1),
                    })}
                    onClick={() => update((s) => ({ ...s, dose: k }))}
                    className="h-[42px] rounded-lg border border-line transition-transform duration-100 hover:-translate-y-0.5 aria-checked:shadow-[0_0_0_2px_var(--color-paper),0_0_0_4px_var(--color-ink)]"
                    style={{ background: shown(mixAt(f)) }}
                  />
                )
              })}
            </div>
          ) : choice && !choice.agent ? (
            <p className="text-center text-sm opacity-75">
              {t(`color.temperature.reasons.${choice.reason}`)}
            </p>
          ) : null}
          <p className="mt-1.5 flex justify-between text-xs opacity-65">
            <span>{t('color.temperature.aLittle')}</span>
            <span>{t('color.temperature.aLot')}</span>
          </p>
        </div>
        <div className="mx-auto w-[min(520px,100%)]">
          <div
            aria-hidden="true"
            className="relative h-2.5 rounded-full bg-[linear-gradient(90deg,#2F7FD0,#9AA3AE_50%,#F08A2A)]"
          >
            {baseColor && result ? (
              <>
                <span
                  className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ink bg-paper-2 opacity-45 transition-[left] duration-200"
                  style={{ left: gaugePosition(baseColor) }}
                />
                <span
                  className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[2.5px] border-ink bg-paper-2 transition-[left] duration-200"
                  style={{ left: gaugePosition(result) }}
                />
              </>
            ) : null}
          </div>
          <p className="mt-1.5 flex items-baseline justify-between text-xs">
            <span className="opacity-65">{t('color.temperature.coolEnd')}</span>
            <b className="text-sm">{kindText}</b>
            <span className="opacity-65">{t('color.temperature.warmEnd')}</span>
          </p>
        </div>
      </div>
      <Toolbar label={t('color.temperature.settings')}>
        <Segmented
          label={t('paints.source')}
          value={mix.source}
          onChange={(source) => updateMix((s) => ({ ...s, source }))}
          options={Object.values(PaintSource).map((source) => ({
            value: source,
            label: t(`paints.sources.${source}`),
          }))}
        />
        <ToggleButton pressed={grey} onToggle={() => setGrey(!grey)} label={t('studio.greyView')}>
          <GreyIcon />
        </ToggleButton>
      </Toolbar>
    </>
  )

  const panels = (
    <>
      <Panel title={t('color.temperature.yourColour')}>
        <PaintSelect
          label={base ? t('color.temperature.pick', { name: base.name }) : t('color.temperature.noInventory')}
          value={base}
          options={options}
          source={mix.source}
          onChange={(paintId) => update((s) => ({ ...s, paintId }))}
          swatch={baseColor ? shown(baseColor) : undefined}
          emptyText={t('color.temperature.noInventory')}
        />
        <p className="text-sm/[1.45]">
          {base && agent
            ? t('color.temperature.sentence', {
                verb,
                added: partsText(ratio[1] ?? 0),
                agent: agent.name,
                base: partsText(ratio[0] ?? 1),
              })
            : base && choice && !choice.agent
              ? `${t(`color.temperature.impossible.${action}`)} ${t(`color.temperature.reasons.${choice.reason}`)}`
              : null}
        </p>
      </Panel>
      <Panel title={t('color.temperature.infoTitle')}>
        <p className="text-sm/[1.45]">{t('color.temperature.info')}</p>
        <Note>{t('studio.indicative')}</Note>
      </Panel>
    </>
  )

  return <Dashboard layout={layout} stage={stage} panels={panels} stageLabel={t('color.tabs.temperature')} />
}
