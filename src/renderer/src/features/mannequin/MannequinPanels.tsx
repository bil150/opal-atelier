import { Trans, useTranslation } from 'react-i18next'
import { Note, Panel } from '@renderer/components/ui/Panel'
import { Segmented } from '@renderer/components/ui/Segmented'
import { BUTTON, BUTTON_GHOST, TOOL_BUTTON } from '@renderer/components/ui/buttons'
import {
  BodyShape,
  DURATIONS,
  HEADS,
  LIGHT_ANGLES,
  LIGHT_ELEVATION,
  LightPreset,
  Material,
  Shading,
  ViewPreset,
  type MannequinSettings,
} from './mannequin-settings'
import { formatTime } from './pose-math'
import { POSES, PoseFamily, type Pose } from './poses'
import type { SketchTimer } from './use-sketch-timer'

type SettingsUpdate = (patch: Partial<MannequinSettings>) => void

export function PosePanel({
  pose,
  onPose,
  onStep,
}: {
  readonly pose: Pose
  readonly onPose: (id: string) => void
  readonly onStep: (direction: 1 | -1) => void
}) {
  const { t } = useTranslation()
  return (
    <Panel title={t('mannequin.pose.title')} defaultOpen>
      <select
        value={pose.id}
        aria-label={t('mannequin.pose.choose')}
        onChange={(e) => onPose(e.target.value)}
        className="min-h-11 w-full rounded-md border border-line bg-paper-2 px-2"
      >
        {Object.values(PoseFamily).map((family) => (
          <optgroup key={family} label={t(`mannequin.families.${family}`)}>
            {POSES.filter((p) => p.family === family).map((p) => (
              <option key={p.id} value={p.id}>
                {t(`mannequin.poses.${p.id}`, { defaultValue: p.id })}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <div role="group" aria-label={t('mannequin.pose.nav')} className="flex gap-2">
        <button
          type="button"
          aria-label={t('mannequin.pose.previousLabel')}
          onClick={() => onStep(-1)}
          className={`${TOOL_BUTTON} flex-1`}
        >
          {t('mannequin.pose.previous')}
        </button>
        <button
          type="button"
          aria-label={t('mannequin.pose.nextLabel')}
          onClick={() => onStep(1)}
          className={`${TOOL_BUTTON} flex-1`}
        >
          {t('mannequin.pose.next')}
        </button>
      </div>
    </Panel>
  )
}

export function ViewPanel({ onView }: { readonly onView: (preset: ViewPreset) => void }) {
  const { t } = useTranslation()
  return (
    <Panel title={t('mannequin.view.title')}>
      <div role="group" aria-label={t('mannequin.view.label')} className="flex flex-wrap gap-1.5">
        {Object.values(ViewPreset).map((preset) => (
          <button key={preset} type="button" onClick={() => onView(preset)} className={TOOL_BUTTON}>
            {t(`mannequin.view.presets.${preset}`)}
          </button>
        ))}
      </div>
      <Note>{t('mannequin.view.note')}</Note>
    </Panel>
  )
}

export function FigurePanel({
  settings,
  onSettings,
}: {
  readonly settings: MannequinSettings
  readonly onSettings: SettingsUpdate
}) {
  const { t, i18n } = useTranslation()
  const heads = new Intl.NumberFormat(i18n.resolvedLanguage ?? 'en').format(settings.heads)
  return (
    <Panel title={t('mannequin.figure.title')}>
      <Segmented
        label={t('mannequin.figure.shape')}
        value={settings.shape}
        onChange={(shape) => onSettings({ shape })}
        stretch
        options={Object.values(BodyShape).map((shape) => ({
          value: shape,
          label: t(`mannequin.figure.shapes.${shape}`),
        }))}
      />
      <label className="flex flex-col gap-1.5 text-sm">
        <span>
          <Trans i18nKey="mannequin.figure.heads" values={{ value: heads }} />
        </span>
        <input
          type="range"
          min={HEADS.min}
          max={HEADS.max}
          step={HEADS.step}
          value={settings.heads}
          aria-label={t('mannequin.figure.headsLabel')}
          onChange={(e) => onSettings({ heads: Number(e.target.value) })}
        />
      </label>
      <Note>{t('mannequin.figure.headsNote')}</Note>
    </Panel>
  )
}

export function TimerPanel({
  timer,
  settings,
  onSettings,
}: {
  readonly timer: SketchTimer
  readonly settings: MannequinSettings
  readonly onSettings: SettingsUpdate
}) {
  const { t } = useTranslation()
  return (
    <Panel title={t('mannequin.timer.title')} defaultOpen>
      <output aria-label={t('mannequin.timer.left')} className="text-center text-4xl font-bold tabular-nums">
        {formatTime(timer.left)}
      </output>
      <Segmented
        label={t('mannequin.timer.duration')}
        value={settings.duration}
        onChange={(duration) => onSettings({ duration })}
        stretch
        options={DURATIONS.map((d) => ({ value: d, label: t(`mannequin.timer.durations.${d}`) }))}
      />
      <div className="flex flex-wrap gap-2">
        <button type="button" aria-pressed={timer.running} onClick={timer.toggle} className={BUTTON}>
          {timer.running
            ? t('mannequin.timer.pause')
            : timer.started
              ? t('mannequin.timer.resume')
              : t('mannequin.timer.start')}
        </button>
        <button type="button" onClick={timer.reset} className={BUTTON_GHOST}>
          {t('mannequin.timer.reset')}
        </button>
      </div>
    </Panel>
  )
}

export function SessionPanel({
  count,
  settings,
  onSettings,
}: {
  readonly count: number
  readonly settings: MannequinSettings
  readonly onSettings: SettingsUpdate
}) {
  const { t } = useTranslation()
  return (
    <Panel title={t('mannequin.session.title')}>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={settings.session}
          onChange={(e) => onSettings({ session: e.target.checked })}
        />
        {t('mannequin.session.newPose')}
      </label>
      <p aria-live="polite" className="text-[13px] opacity-70">
        {count ? t('mannequin.session.drawn', { count }) : ''}
      </p>
      <Note>{t('mannequin.session.space')}</Note>
    </Panel>
  )
}

export function LightPanel({
  settings,
  onSettings,
}: {
  readonly settings: MannequinSettings
  readonly onSettings: SettingsUpdate
}) {
  const { t } = useTranslation()
  return (
    <Panel title={t('mannequin.light.title')} defaultOpen>
      <div role="group" aria-label={t('mannequin.light.presetsLabel')} className="flex flex-wrap gap-1.5">
        {Object.values(LightPreset).map((preset) => {
          const [lightAzimuth, lightElevation] = LIGHT_ANGLES[preset]
          return (
            <button
              key={preset}
              type="button"
              aria-pressed={
                settings.lightAzimuth === lightAzimuth && settings.lightElevation === lightElevation
              }
              onClick={() => onSettings({ lightAzimuth, lightElevation })}
              className={TOOL_BUTTON}
            >
              {t(`mannequin.light.presets.${preset}`)}
            </button>
          )
        })}
      </div>
      <label className="flex flex-col gap-1.5 text-sm">
        <span>
          <Trans i18nKey="mannequin.light.direction" values={{ value: settings.lightAzimuth }} />
        </span>
        <input
          type="range"
          min={0}
          max={360}
          step={5}
          value={settings.lightAzimuth}
          aria-label={t('mannequin.light.directionLabel')}
          onChange={(e) => onSettings({ lightAzimuth: Number(e.target.value) })}
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        <span>
          <Trans i18nKey="mannequin.light.height" values={{ value: settings.lightElevation }} />
        </span>
        <input
          type="range"
          min={LIGHT_ELEVATION.min}
          max={LIGHT_ELEVATION.max}
          step={1}
          value={settings.lightElevation}
          aria-label={t('mannequin.light.heightLabel')}
          onChange={(e) => onSettings({ lightElevation: Number(e.target.value) })}
        />
      </label>
    </Panel>
  )
}

export function ValuesPanel({
  settings,
  onSettings,
}: {
  readonly settings: MannequinSettings
  readonly onSettings: SettingsUpdate
}) {
  const { t } = useTranslation()
  return (
    <Panel title={t('mannequin.values.title')}>
      <Segmented
        label={t('mannequin.values.shading')}
        value={settings.shading}
        onChange={(shading) => onSettings({ shading })}
        stretch
        options={Object.values(Shading).map((shading) => ({
          value: shading,
          label: t(`mannequin.values.shadings.${shading}`),
        }))}
      />
      <Segmented
        label={t('mannequin.values.material')}
        value={settings.material}
        onChange={(material) => onSettings({ material })}
        stretch
        options={Object.values(Material).map((material) => ({
          value: material,
          label: t(`mannequin.values.materials.${material}`),
        }))}
      />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={settings.shadow}
          onChange={(e) => onSettings({ shadow: e.target.checked })}
        />
        {t('mannequin.values.shadow')}
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={settings.floorGrid}
          onChange={(e) => onSettings({ floorGrid: e.target.checked })}
        />
        {t('mannequin.values.floorGrid')}
      </label>
    </Panel>
  )
}
