import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router'
import { Dashboard, Toolbar } from '@renderer/components/studio/Dashboard'
import type { StudioLayout } from '@renderer/components/studio/studio-options'
import { ModeTabs } from '@renderer/components/ui/ModeTabs'
import { Note, Panel } from '@renderer/components/ui/Panel'
import { GreyIcon, Segmented, ToggleButton } from '@renderer/components/ui/Segmented'
import { Stepper } from '@renderer/components/ui/Stepper'
import { PaintSelect } from '@renderer/features/paints/PaintSelect'
import {
  PaintSource,
  paintOptions,
  resolveSlot,
  ownedFirst,
  DEFAULT_GENERIC_IDS,
} from '@renderer/features/paints/paint-options'
import { useTubes } from '@renderer/features/paints/tube-store'
import { useStoredSettings } from '@renderer/hooks/use-local-storage'
import { toLocale } from '@renderer/i18n/locale'
import {
  bestAddition,
  cssColor,
  hexToRgb01,
  mixPaints,
  paletteReach,
  readableInk,
  reduceParts,
  toGrey,
  type Rgb01,
} from '@renderer/lib/color-theory'
import { rgbToLab } from '@renderer/lib/paint-mixer'
import { AppRoute, ToolPath } from '@renderer/routes'
import {
  ColorSection,
  MAX_PARTS,
  MIX_SETTINGS_KEY,
  MixMode,
  PALETTE_MAX,
  PALETTE_MIN,
  PALETTE_PRESETS,
  PalettePreset,
  sanitizeMix,
  type MixSettings,
} from '../color-settings'
import { MixChart } from './MixChart'
import { MixingPlate, ReachWheel } from './PaletteCharts'

const ICON_SINGLE = (
  <>
    <path d="M8 3.5c2.6 3.2 4 5.4 4 7.2a4 4 0 0 1-8 0c0-1.8 1.4-4 4-7.2z" />
    <path d="M16 9.5c2.6 3.2 4 5.4 4 7.2a4 4 0 0 1-8 0c0-1.8 1.4-4 4-7.2z" />
  </>
)
const ICON_PALETTE = (
  <>
    <path d="M12 3a9 9 0 1 0 0 18c1.2 0 1.8-.8 1.8-1.7 0-1.2-1-1.6-1-2.6 0-.9.7-1.5 1.7-1.5H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3z" />
    <circle cx="7.5" cy="11" r="1.3" />
    <circle cx="10.5" cy="7" r="1.3" />
    <circle cx="15.5" cy="7.5" r="1.3" />
  </>
)

/** Lightness L* of a display colour, 0 (black) to 100 (white). */
function lightness(c: Rgb01): number {
  return Math.round(
    rgbToLab({ r: Math.round(c[0] * 255), g: Math.round(c[1] * 255), b: Math.round(c[2] * 255) })[0],
  )
}

interface MixViewProps {
  readonly layout: StudioLayout
  /** From the address: /color/mix or /color/palette. */
  readonly mode: MixMode
}

/** Mixing simulator: one precise mix of 2–3 colours, or everything a limited palette can reach. */
export function MixView({ layout, mode }: MixViewProps) {
  const { t, i18n } = useTranslation()
  const locale = toLocale(i18n.resolvedLanguage)
  const navigate = useNavigate()
  const inventory = useTubes().tubes
  const [settings, update] = useStoredSettings(MIX_SETTINGS_KEY, sanitizeMix)
  const [grey, setGrey] = useState(false)

  const palette = mode === MixMode.Palette
  const options = useMemo(
    () => paintOptions(settings.source, locale, inventory),
    [settings.source, locale, inventory],
  )
  const slotIds = palette ? settings.paletteSlots : settings.slots
  const slotCount = palette ? settings.paletteSize : settings.count
  const slots = Array.from({ length: slotCount }, (_, i) =>
    resolveSlot(slotIds[i] ?? '', i, settings.source, options),
  )
  const hexes = slots.map((s) => s?.hex ?? '#808080')
  const names = slots.map((s) => s?.name ?? t('paints.noTube'))
  const shown = (c: Rgb01) => (grey ? toGrey(c) : c)

  const set = (patch: Partial<MixSettings>) => update((s) => ({ ...s, ...patch }))
  const setSlot = (i: number, id: string) =>
    update((s) =>
      palette
        ? { ...s, paletteSlots: s.paletteSlots.map((v, k) => (k === i ? id : v)) }
        : { ...s, slots: s.slots.map((v, k) => (k === i ? id : v)) },
    )
  const setMode = (next: MixMode) => {
    set({ mode: next })
    void navigate(`${AppRoute.Color}/${next === MixMode.Palette ? ColorSection.Palette : ColorSection.Mix}`, {
      replace: true,
    })
  }
  const setSource = (source: PaintSource) => {
    if (source === settings.source) return
    // Each slot takes a colour of the new source (owned tubes first) unless its colour exists there.
    const next = paintOptions(source, locale, inventory)
    const firsts = ownedFirst(next)
    const adapt = (list: readonly string[]) =>
      list.map((id, i) =>
        next.some((o) => o.id === id)
          ? id
          : ((source === PaintSource.Generic ? DEFAULT_GENERIC_IDS[i] : firsts[i]?.id) ?? ''),
      )
    update((s) => ({ ...s, source, slots: adapt(s.slots), paletteSlots: adapt(s.paletteSlots) }))
  }
  const changePaletteSize = (by: number) => {
    const size = Math.max(PALETTE_MIN, Math.min(PALETTE_MAX, settings.paletteSize + by))
    if (size === settings.paletteSize) return
    // A colour added is the one that widens the reachable area the most.
    const added = by > 0 ? bestAddition(hexes, options, settings.white) : null
    update((s) => ({
      ...s,
      paletteSize: size,
      paletteSlots: added
        ? s.paletteSlots.map((v, k) => (k === s.paletteSize ? added.id : v))
        : s.paletteSlots,
    }))
  }
  const applyPreset = (preset: PalettePreset) => {
    const ids = PALETTE_PRESETS[preset]
    update((s) => ({
      ...s,
      source: PaintSource.Generic,
      paletteSize: ids.length,
      white: true,
      paletteSlots: s.paletteSlots.map((v, k) => ids[k] ?? v),
    }))
  }

  const parts = settings.parts.slice(0, settings.count)
  const sum = parts.reduce((a, b) => a + b, 0)
  const result = sum ? mixPaints(hexes, parts) : null
  const ratio = sum ? reduceParts(parts).join(' : ') : '—'
  // Recomputed only when the palette itself changes (thousands of mixes).
  const paletteKey = palette ? hexes.join(',') : ''
  const reach = useMemo(
    () => (paletteKey ? paletteReach(paletteKey.split(','), settings.white) : null),
    [paletteKey, settings.white],
  )
  const sectorNames = t('color.mix.sectors', { returnObjects: true })

  const stage = (
    <>
      <ModeTabs
        label={t('color.mix.modes')}
        value={mode}
        onChange={setMode}
        options={[
          {
            value: MixMode.Single,
            title: t('color.mix.single'),
            subtitle: t('color.mix.singleSub'),
            icon: ICON_SINGLE,
          },
          {
            value: MixMode.Palette,
            title: t('color.mix.palette'),
            subtitle: t('color.mix.paletteSub'),
            icon: ICON_PALETTE,
          },
        ]}
      />
      {palette && reach ? (
        <div className="grid gap-3 rounded-lg border border-line bg-paper p-3 max-sm:h-auto max-sm:min-h-0 max-sm:flex-1 max-sm:grid-cols-2 max-sm:gap-2 max-sm:p-2 sm:h-[min(62vh,640px)] sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <div className="flex min-h-0 min-w-0 flex-col justify-center gap-2">
            <MixingPlate hexes={hexes} names={names} white={settings.white} shown={shown} />
            <p className="text-center text-[13px] opacity-70">{t('color.mix.plateHelp')}</p>
          </div>
          <div className="flex min-h-0 min-w-0 flex-col justify-center gap-2">
            <ReachWheel hexes={hexes} names={names} white={settings.white} shown={shown} reach={reach} />
            <p className="text-center text-[13px] opacity-70">{t('color.mix.reachHelp')}</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-3 rounded-lg border border-line bg-paper p-3 max-sm:h-auto max-sm:min-h-0 max-sm:flex-1 max-sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] max-sm:gap-2 max-sm:p-2 sm:h-[min(62vh,640px)] sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <div
            role="img"
            aria-label={t('color.mix.resultLabel', { ratio })}
            className="grid min-h-[110px] place-items-center rounded-lg border border-line transition-colors duration-150 sm:min-h-[140px]"
            style={{ background: result ? cssColor(shown(result)) : 'transparent' }}
          >
            <span
              className="text-[clamp(22px,4vw,40px)] leading-none font-bold tabular-nums"
              style={{ color: result ? readableInk(shown(result)) : undefined }}
            >
              {ratio}
            </span>
          </div>
          <div className="flex min-h-0 min-w-0 flex-col justify-center gap-2">
            <MixChart
              hexes={hexes}
              names={names}
              parts={parts}
              shown={shown}
              onParts={(next) => set({ parts: settings.parts.map((v, i) => next[i] ?? v) })}
            />
            <p className="text-center text-[13px] opacity-70">
              {settings.count === 2 ? t('color.mix.bandHelp') : t('color.mix.triangleHelp')}
            </p>
          </div>
        </div>
      )}
      <Toolbar label={t('color.mix.settings')}>
        {palette ? (
          <>
            <div
              role="group"
              aria-label={t('color.mix.count')}
              className="flex items-center overflow-hidden rounded-md border border-line bg-paper-2"
            >
              <button
                type="button"
                aria-label={t('color.mix.fewer')}
                disabled={settings.paletteSize <= PALETTE_MIN}
                onClick={() => changePaletteSize(-1)}
                className="size-[38px] text-lg font-semibold enabled:hover:bg-highlight disabled:opacity-35"
              >
                −
              </button>
              <output
                aria-live="polite"
                className="min-w-[92px] text-center text-sm font-semibold tabular-nums"
              >
                {t('color.mix.colours', { count: settings.paletteSize })}
              </output>
              <button
                type="button"
                aria-label={t('color.mix.more')}
                disabled={settings.paletteSize >= PALETTE_MAX}
                onClick={() => changePaletteSize(1)}
                className="size-[38px] text-lg font-semibold enabled:hover:bg-highlight disabled:opacity-35"
              >
                +
              </button>
            </div>
            <ToggleButton
              pressed={settings.white}
              onToggle={() => set({ white: !settings.white })}
              label={t('color.mix.whiteTitle')}
              wide
            >
              {t('color.mix.white')}
            </ToggleButton>
          </>
        ) : (
          <Segmented<2 | 3>
            label={t('color.mix.count')}
            value={settings.count}
            onChange={(count) => set({ count })}
            options={[2, 3].map((n) => ({ value: n as 2 | 3, label: t('color.mix.colours', { count: n }) }))}
          />
        )}
        <ToggleButton pressed={grey} onToggle={() => setGrey(!grey)} label={t('studio.greyView')}>
          <GreyIcon />
        </ToggleButton>
      </Toolbar>
    </>
  )

  const panels = (
    <>
      <Panel>
        <Segmented
          label={t('paints.source')}
          value={settings.source}
          onChange={setSource}
          stretch
          options={Object.values(PaintSource).map((source) => ({
            value: source,
            label: t(`paints.sources.${source}`),
          }))}
        />
        {palette && settings.source === PaintSource.Generic ? (
          <div role="group" aria-label={t('color.mix.presets')} className="flex flex-wrap gap-1.5">
            {Object.values(PalettePreset).map((preset) => (
              <button
                key={preset}
                type="button"
                title={t(`color.mix.presetTitles.${preset}`)}
                onClick={() => applyPreset(preset)}
                className="min-h-[34px] rounded-full border border-line bg-paper-2 px-3 text-[13px] font-semibold hover:bg-highlight"
              >
                {t(`color.mix.presetNames.${preset}`)}
              </button>
            ))}
          </div>
        ) : null}
        <ul className="flex flex-col gap-2">
          {slots.map((slot, i) => (
            <li key={i} className={palette ? '' : 'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2'}>
              <PaintSelect
                label={t('color.mix.slot', { n: i + 1, name: names[i] })}
                value={slot}
                options={options}
                source={settings.source}
                onChange={(id) => setSlot(i, id)}
                emptyText={t('paints.noTube')}
              />
              {palette ? null : (
                <Stepper
                  value={settings.parts[i] ?? 0}
                  min={0}
                  max={MAX_PARTS}
                  decreaseLabel={t('color.mix.partFewer', { name: names[i] })}
                  increaseLabel={t('color.mix.partMore', { name: names[i] })}
                  valueLabel={t('color.mix.parts', { count: settings.parts[i] ?? 0 })}
                  onChange={(v) => set({ parts: settings.parts.map((p, k) => (k === i ? v : p)) })}
                />
              )}
            </li>
          ))}
        </ul>
        {settings.source === PaintSource.Generic ? <Note>{t('paints.genericNote')}</Note> : null}
        {settings.source === PaintSource.Inventory && inventory.length === 0 ? (
          <Note>
            <Link to={ToolPath.ImageStudyPaints}>{t('paints.noTubes')}</Link>
          </Note>
        ) : null}
      </Panel>
      {palette && reach ? (
        <Panel title={t('color.mix.paletteTitle')}>
          <p className="text-sm/[1.45]">{t('color.mix.paletteIntro')}</p>
          <p className="text-sm/[1.45]">
            {reach.vivid.length
              ? t('color.mix.vivid', { list: reach.vivid.map((k) => sectorNames[k]).join(', ') })
              : t('color.mix.noVivid')}{' '}
            {reach.missing.length
              ? t('color.mix.missing', { list: reach.missing.map((k) => sectorNames[k]).join(', ') })
              : t('color.mix.allReachable')}
          </p>
          <Note>{t('studio.indicative')}</Note>
        </Panel>
      ) : (
        <Panel title={t('color.mix.result')}>
          <ul className="flex flex-col gap-1.5">
            {slots.map((slot, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <span
                  className="size-[18px] flex-none rounded border border-line"
                  style={{ background: cssColor(shown(hexToRgb01(slot?.hex ?? '#808080'))) }}
                />
                <span className="min-w-0 truncate">{slot?.name ?? t('paints.noTube')}</span>
                <b className="ml-auto tabular-nums">
                  {sum ? `${Math.round(((parts[i] ?? 0) / sum) * 100)} %` : '—'}
                </b>
              </li>
            ))}
          </ul>
          <p className="text-sm">
            {t('color.mix.value')}{' '}
            <b>{result ? t('color.mix.valueOf', { value: lightness(result) }) : '—'}</b>
          </p>
          <Note>{t('studio.indicative')}</Note>
        </Panel>
      )}
    </>
  )

  return <Dashboard layout={layout} stage={stage} panels={panels} stageLabel={t('color.tabs.mix')} />
}
