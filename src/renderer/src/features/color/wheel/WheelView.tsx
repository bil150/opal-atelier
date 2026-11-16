import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { Dashboard, Stage, Toolbar } from '@renderer/components/studio/Dashboard'
import type { StudioLayout } from '@renderer/components/studio/studio-options'
import { Note, Panel } from '@renderer/components/ui/Panel'
import { GreyIcon, Segmented, ToggleButton } from '@renderer/components/ui/Segmented'
import { isOneOf, useStoredSettings } from '@renderer/hooks/use-local-storage'
import {
  Harmony,
  WheelMode,
  cssColor,
  desaturate,
  fromOklab,
  harmonyAngles,
  mixOklab,
  toGrey,
  toOklab,
  wheelColor,
} from '@renderer/lib/color-theory'
import { SATURATIONS, SEGMENT_COUNTS, WheelStyle, sanitizeWheel, type SegmentCount } from '../color-settings'
import { useHueNames } from '../use-hue-names'

const isHarmony = isOneOf(Object.values(Harmony))
import { ColorWheel } from './ColorWheel'
import { snapAngle, wheelStep } from './wheel-snap'

const STYLE_ICONS: Readonly<Record<WheelStyle, React.ReactNode>> = {
  [WheelStyle.Ring]: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4.5" />
    </>
  ),
  [WheelStyle.Centre]: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 6.5l4.8 8.3H7.2z" />
    </>
  ),
  [WheelStyle.Discs]: (
    <>
      <circle cx="12" cy="8.5" r="5" />
      <circle cx="8.8" cy="14" r="5" />
      <circle cx="15.2" cy="14" r="5" />
    </>
  ),
}

/** Lightenings shown after each colour: 0 to 80 % of the way to white, in OKLab. */
const TINTS = [0, 0.2, 0.4, 0.6, 0.8]

export function WheelView({ layout }: { readonly layout: StudioLayout }) {
  const { t } = useTranslation()
  const [settings, update] = useStoredSettings('color:wheel', sanitizeWheel)
  const hueName = useHueNames(settings.mode)
  const hueId = useId()
  const satId = useId()
  const base = snapAngle(settings.base, settings.segments)
  const set = <K extends keyof typeof settings>(key: K, value: (typeof settings)[K]) =>
    update((s) => ({ ...s, [key]: value }))
  const shown = (c: Parameters<typeof toGrey>[0]) => (settings.grey ? toGrey(c) : c)
  const discs = settings.style === WheelStyle.Discs

  const stage = (
    <>
      <Stage>
        <ColorWheel settings={settings} onBaseChange={(b) => set('base', b)} />
      </Stage>
      <Toolbar label={t('color.wheel.settings')}>
        <Segmented
          label={t('color.wheel.type')}
          value={settings.mode}
          onChange={(v) => set('mode', v)}
          options={[
            { value: WheelMode.Painter, label: 'RYB', title: t('color.wheel.types.ryb') },
            { value: WheelMode.Light, label: 'RGB', title: t('color.wheel.types.rgb') },
          ]}
        />
        <Segmented
          label={t('color.wheel.style')}
          value={settings.style}
          onChange={(v) => set('style', v)}
          options={Object.values(WheelStyle).map((style) => ({
            value: style,
            ariaLabel: t(`color.wheel.styles.${style}`),
            label: (
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="size-5 fill-none stroke-current stroke-[1.7]"
              >
                {STYLE_ICONS[style]}
              </svg>
            ),
          }))}
        />
        {discs ? null : (
          <Segmented<SegmentCount>
            label={t('color.wheel.segments')}
            value={settings.segments}
            onChange={(v) => update((s) => ({ ...s, segments: v, base: snapAngle(s.base, v) }))}
            options={SEGMENT_COUNTS.map((n) =>
              n
                ? { value: n, label: String(n), title: t('color.wheel.segmentsCount', { count: n }) }
                : { value: n, label: '∞', ariaLabel: t('color.wheel.continuous') },
            )}
          />
        )}
        <ToggleButton
          pressed={settings.grey}
          onToggle={() => set('grey', !settings.grey)}
          label={t('studio.greyView')}
        >
          <GreyIcon />
        </ToggleButton>
      </Toolbar>
    </>
  )

  const synthesis = settings.mode === WheelMode.Painter ? 'ryb' : 'rgb'
  const panels = (
    <>
      {discs ? null : (
        <Panel title={t('color.wheel.harmony')} defaultOpen>
          <select
            aria-label={t('color.wheel.harmony')}
            value={settings.harmony}
            onChange={(e) => {
              const harmony = e.target.value
              if (isHarmony(harmony)) set('harmony', harmony)
            }}
            className="min-h-11 w-full rounded-md border border-line bg-paper-2 px-2.5"
          >
            {Object.values(Harmony).map((h) => (
              <option key={h} value={h}>
                {t(`color.wheel.harmonies.${h}`)}
              </option>
            ))}
          </select>
          <label htmlFor={hueId} className="text-[13px] font-semibold opacity-70">
            {t('color.wheel.start')}
          </label>
          <input
            id={hueId}
            type="range"
            min={0}
            max={359}
            step={wheelStep(settings.segments)}
            value={base}
            onChange={(e) => set('base', Number(e.target.value))}
            className="w-full accent-ink"
          />
          <label htmlFor={satId} className="text-[13px] font-semibold opacity-70">
            {t('color.wheel.saturation')} <b className="font-bold">{settings.saturation * 100} %</b>
          </label>
          <input
            id={satId}
            type="range"
            min={25}
            max={100}
            step={25}
            value={settings.saturation * 100}
            onChange={(e) => {
              const s = Number(e.target.value) / 100
              if ((SATURATIONS as readonly number[]).includes(s)) set('saturation', s)
            }}
            className="w-full accent-ink"
          />
        </Panel>
      )}
      {discs ? null : (
        <Panel
          title={
            <>
              {t('color.wheel.colours')} <span className="font-normal">{t('color.wheel.coloursSub')}</span>
            </>
          }
        >
          <ul aria-live="polite" className="flex flex-col gap-2.5">
            {harmonyAngles(settings.harmony, base).map((angle, i) => {
              const color = desaturate(wheelColor(settings.mode, angle), settings.saturation)
              const { name, rank } = hueName(angle)
              const lab = toOklab(color)
              return (
                <li key={i} className="flex flex-col gap-1">
                  <div className="flex items-baseline gap-2 text-sm">
                    <b className="font-semibold">{name}</b>
                    <span className="ml-auto text-xs opacity-65">{rank}</span>
                  </div>
                  {/* In paint, white cools and dulls a colour: indicative only. No darkening: black changes a paint’s hue. */}
                  <div
                    role="img"
                    aria-label={t('color.wheel.tints', { name })}
                    className="grid h-[30px] grid-cols-[2fr_repeat(4,1fr)] overflow-hidden rounded-md border border-line"
                  >
                    {TINTS.map((k) => (
                      <span
                        key={k}
                        className="transition-colors duration-150"
                        style={{ background: cssColor(shown(fromOklab(mixOklab(lab, [1, 0, 0], k)))) }}
                      />
                    ))}
                  </div>
                </li>
              )
            })}
          </ul>
        </Panel>
      )}
      <Panel title={t(`color.wheel.synthesis.${synthesis}.title`)}>
        <p className="text-sm/[1.45]">{t(`color.wheel.synthesis.${synthesis}.text`)}</p>
        <Note>{t('color.wheel.screenNote')}</Note>
      </Panel>
    </>
  )

  return <Dashboard layout={layout} stage={stage} panels={panels} stageLabel={t('color.tabs.wheel')} />
}
