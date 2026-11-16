import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router'
import { PageShell } from '@renderer/components/layout/PageShell'
import { PageWidth } from '@renderer/components/layout/page-width'
import { Dashboard } from '@renderer/components/studio/Dashboard'
import { StudioFrame, type StudioTab } from '@renderer/components/studio/StudioFrame'
import { useStudioLayout } from '@renderer/components/studio/use-studio-layout'
import { BUTTON, BUTTON_GHOST } from '@renderer/components/ui/buttons'
import { useLocalStorage, useStoredSettings } from '@renderer/hooks/use-local-storage'
import { saveFile } from '@renderer/platform/save-file'
import { AppRoute } from '@renderer/routes'
import {
  FigurePanel,
  LightPanel,
  PosePanel,
  SessionPanel,
  TimerPanel,
  ValuesPanel,
  ViewPanel,
} from './MannequinPanels'
import { MannequinStage } from './MannequinStage'
import {
  MannequinSection,
  POSE_KEY,
  SETTINGS_KEY,
  VIEW_ANGLES,
  ViewPreset,
  isMannequinSection,
  sanitizeSettings,
  type MannequinSettings,
} from './mannequin-settings'
import { drawFromBag, formatTime } from './pose-math'
import { DEFAULT_POSE, POSES, poseById } from './poses'
import type { MannequinScene } from './scene/mannequin-scene'
import { beep, useSketchTimer } from './use-sketch-timer'

const ICON_PROPS = { strokeWidth: 1.8 }

const TAB_ICONS: Readonly<Record<MannequinSection, ReactNode>> = {
  [MannequinSection.Poses]: (
    <g {...ICON_PROPS}>
      <circle cx="12" cy="4.5" r="2" />
      <path d="M12 7v6M12 13l-3 7M12 13l3 7M6 9.5l6-1.5 6 1.5" />
    </g>
  ),
  [MannequinSection.Sketch]: (
    <g {...ICON_PROPS}>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2.5 2.5M10 2h4" />
    </g>
  ),
  [MannequinSection.Light]: (
    <g {...ICON_PROPS}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </g>
  ),
}

const isPoseId = (value: unknown): value is string => poseById(value) !== undefined
const viewOf = (preset: ViewPreset) => {
  const [azimuth, elevation] = VIEW_ANGLES[preset]
  return { azimuth, elevation }
}

/** Mannequin: an articulated wooden figure in 3D, poses to draw from, a timed sketch, adjustable light. */
export function MannequinPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { section: param } = useParams()
  const section = isMannequinSection(param) ? param : MannequinSection.Poses

  const [layout, setLayout] = useStudioLayout()
  const [settings, setSettings] = useStoredSettings(SETTINGS_KEY, sanitizeSettings)
  const [poseId, setPoseId] = useLocalStorage(POSE_KEY, DEFAULT_POSE.id, isPoseId)
  const pose = poseById(poseId) ?? DEFAULT_POSE
  const [view, setView] = useState<{ azimuth: number; elevation: number } | null>(() =>
    viewOf(ViewPreset.ThreeQuarter),
  )
  const bag = useRef<string[]>([])
  const scene = useRef<MannequinScene | null>(null)

  const updateSettings = (patch: Partial<MannequinSettings>) => setSettings((s) => ({ ...s, ...patch }))

  /** Shows a pose, and its suggested viewpoint when it has one. */
  const show = (id: string) => {
    const next = poseById(id) ?? DEFAULT_POSE
    setPoseId(next.id)
    if (next.view) setView({ azimuth: next.view[0], elevation: next.view[1] })
  }
  const step = (direction: 1 | -1) => {
    const i = POSES.findIndex((p) => p.id === pose.id)
    const next = POSES[(i + direction + POSES.length) % POSES.length]
    if (next) show(next.id)
  }
  const random = () => {
    const drawn = drawFromBag(
      bag.current,
      POSES.map((p) => p.id),
      pose.id,
    )
    bag.current = drawn.bag
    show(drawn.id)
  }

  // Latest actions, for listeners set up once (keyboard, end of the timer).
  const latest = useRef<{
    session: boolean
    random: () => void
    step: (d: 1 | -1) => void
    toggle: () => void
  } | null>(null)
  const timer = useSketchTimer(settings.duration, settings.session, () => {
    beep()
    if (latest.current?.session) latest.current.random()
  })
  useLayoutEffect(() => {
    latest.current = { session: settings.session, random, step, toggle: timer.toggle }
  })

  // Keyboard: Page Up / Down (and arrows outside the mannequin) change pose; Space starts or pauses.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target instanceof Element ? e.target : null
      if (target?.closest('input, select, textarea, button, [contenteditable], canvas, [role="tab"]')) return
      if (e.key === 'PageDown' || e.key === 'ArrowRight') latest.current?.step(1)
      else if (e.key === 'PageUp' || e.key === 'ArrowLeft') latest.current?.step(-1)
      else if (e.key === ' ' && (target === document.body || target === null)) {
        e.preventDefault()
        latest.current?.toggle()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const tabs: StudioTab<MannequinSection>[] = Object.values(MannequinSection).map((id) => ({
    id,
    label: t(`mannequin.tabs.${id}`),
    icon: TAB_ICONS[id],
  }))
  const goTo = (next: MannequinSection) => {
    if (next !== section) void navigate(`${AppRoute.Mannequin}/${next}`, { replace: true })
  }

  const exportPng = async () => {
    const blob = await scene.current?.toPng()
    if (!blob) return
    await saveFile(blob, {
      suggestedName: `mannequin-${pose.id}.png`,
      mimeType: 'image/png',
      extensions: ['.png'],
      description: 'PNG',
    })
  }

  const index = POSES.indexOf(pose) + 1
  const stage = (
    <>
      <MannequinStage
        settings={settings}
        pose={pose}
        view={view}
        onScene={(s) => (scene.current = s)}
        overlay={
          timer.started ? (
            <span
              aria-hidden="true"
              className="absolute top-3 right-3 rounded-full bg-ink px-3 py-1 text-sm font-bold text-paper tabular-nums"
            >
              {formatTime(timer.left)}
            </span>
          ) : null
        }
      />
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button type="button" onClick={random} className={BUTTON}>
          {t('mannequin.random')}
        </button>
        <button type="button" onClick={() => void exportPng()} className={BUTTON_GHOST}>
          {t('mannequin.export')}
        </button>
        <span className="text-[13px] text-muted">
          <b>{t(`mannequin.poses.${pose.id}`, { defaultValue: pose.id })}</b> ·{' '}
          {t('mannequin.poseInfo', {
            family: t(`mannequin.families.${pose.family}`),
            n: index,
            total: POSES.length,
          })}
        </span>
      </div>
    </>
  )

  const posePanel = <PosePanel pose={pose} onPose={show} onStep={step} />
  const viewPanel = <ViewPanel onView={(preset) => setView(viewOf(preset))} />
  const panels =
    section === MannequinSection.Sketch ? (
      <>
        <TimerPanel timer={timer} settings={settings} onSettings={updateSettings} />
        {posePanel}
        <SessionPanel count={timer.count} settings={settings} onSettings={updateSettings} />
      </>
    ) : section === MannequinSection.Light ? (
      <>
        <LightPanel settings={settings} onSettings={updateSettings} />
        <ValuesPanel settings={settings} onSettings={updateSettings} />
        {viewPanel}
      </>
    ) : (
      <>
        {posePanel}
        {viewPanel}
        <FigurePanel settings={settings} onSettings={updateSettings} />
      </>
    )

  return (
    <PageShell
      title={t('mannequin.title')}
      breadcrumbs={[{ label: t('app.name'), to: AppRoute.Home }, { label: t('mannequin.title') }]}
      width={PageWidth.Full}
    >
      <h1 className="sr-only">{t('mannequin.title')}</h1>
      <StudioFrame tabs={tabs} activeTab={section} onSelectTab={goTo} layout={layout} onLayout={setLayout}>
        <Dashboard layout={layout} stage={stage} panels={panels} stageLabel={t('mannequin.stage')} />
      </StudioFrame>
    </PageShell>
  )
}
