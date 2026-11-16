import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router'
import { PageShell } from '@renderer/components/layout/PageShell'
import { PageWidth } from '@renderer/components/layout/page-width'
import { Dashboard } from '@renderer/components/studio/Dashboard'
import { StudioFrame, type StudioTab } from '@renderer/components/studio/StudioFrame'
import { defaultLayout } from '@renderer/components/studio/studio-options'
import { useStudioLayout } from '@renderer/components/studio/use-studio-layout'
import { BUTTON, BUTTON_GHOST } from '@renderer/components/ui/buttons'
import { setStatus } from '@renderer/features/paints/tube-draft'
import { DEFAULT_CALCULATION_OPTIONS } from '@renderer/features/paints/tube-classification'
import type { TubeStatus } from '@renderer/features/paints/paint-tube'
import { LEGACY_TUBES_KEY, TUBES_KEY, getTubeStore, useTubes } from '@renderer/features/paints/tube-store'
import { ALL_GROUPS, ChartsTab } from '@renderer/features/paints/ui/charts-tab'
import { STORAGE_PREFIX, useStoredSettings } from '@renderer/hooks/use-local-storage'
import { saveFile } from '@renderer/platform/save-file'
import { AppRoute } from '@renderer/routes'
import { CellsPanel } from './grid/CellsPanel'
import { GridPanel, GridStylePanel } from './grid/GridPanels'
import { allCells, exportCells } from './grid/cell-export'
import { cellKey, parseCellKey, type CellKey } from './grid/cell-refs'
import { gridGeometry, sanitizeGrid } from './grid/grid-settings'
import {
  CALCULATION_KEY,
  GRID_KEY,
  IMAGE_SECTIONS,
  IMAGE_STUDY_KEYS,
  ImageStudySection,
  isImageStudySection,
  sanitizeCalculation,
} from './image-study-settings'
import { PaintsView } from './paints/PaintsView'
import { ImagePaintsDialog } from './recipe/ImagePaintsDialog'
import { RecipePanel } from './recipe/RecipePanel'
import { TargetPanel } from './recipe/TargetPanel'
import { adviceCandidates, computeRecipe } from './recipe/recipe-logic'
import { SettingsView } from './settings/SettingsView'
import { storageUsed } from './settings/backup'
import { ImageStage, type ImagePoint } from './view/ImageStage'
import { NavigationPanel } from './view/NavigationPanel'
import { renderView } from './view/render-view'
import { canvasToPng, isImageFile, loadImageFile } from './view/image-file'
import { createReferenceImage, pixelAt, type ReferenceImage } from './view/reference-image'
import { useZoomPan } from './view/use-zoom-pan'

const MAX_ZOOM = 16
/** Image actions on phones: three equal icon buttons on one line. */
const IMAGE_ACTION = 'max-sm:min-h-10 max-sm:flex-1 max-sm:px-0'

function ActionIcon({ d }: { readonly d: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="size-[18px] flex-none fill-none stroke-current stroke-2 [stroke-linecap:round] [stroke-linejoin:round]"
    >
      <path d={d} />
    </svg>
  )
}
/** The recipe is computed once the picker has paused this long (as on the original page), or on release. */
const RECIPE_PAUSE_MS = 90

const TAB_ICONS: Readonly<Record<ImageStudySection, ReactNode>> = {
  [ImageStudySection.Grid]: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 3v18M15 3v18M3 9h18M3 15h18" />
    </>
  ),
  [ImageStudySection.Values]: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" />
    </>
  ),
  [ImageStudySection.Picker]: (
    <>
      <path d="M14.5 4.5l5 5M17 2l5 5-3 3-5-5z" />
      <path d="M14 7l-9.5 9.5L3 21l4.5-1.5L17 10" />
    </>
  ),
  [ImageStudySection.Paints]: (
    <>
      <path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.6-.8 1.6-1.6 0-.9-.6-1.3-.6-2.1 0-.9.7-1.6 1.6-1.6H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3z" />
      <circle cx="7.5" cy="11" r="1" />
      <circle cx="10" cy="7" r="1" />
      <circle cx="15" cy="7" r="1" />
    </>
  ),
  // Sliders, not a gear: the gear is the app's own settings.
  [ImageStudySection.Settings]: (
    <>
      <path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1" />
      <circle cx="15" cy="6" r="2" />
      <circle cx="9" cy="12" r="2" />
      <circle cx="17" cy="18" r="2" />
    </>
  ),
}

const EXPORT_SUFFIX: Readonly<Record<ImageStudySection, string>> = {
  [ImageStudySection.Grid]: '-grid',
  [ImageStudySection.Values]: '-values',
  [ImageStudySection.Picker]: '',
  [ImageStudySection.Paints]: '',
  [ImageStudySection.Settings]: '',
}

interface ChartsState {
  readonly open: boolean
  readonly tab: ChartsTab
  readonly group: string
}

/** Image study: grid, values, preview and picker with mixing recipe, the user's paints, settings. */
export function ImageStudyPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { section: param } = useParams()
  const section = isImageStudySection(param) ? param : ImageStudySection.Grid
  const showsImage = IMAGE_SECTIONS.includes(section)

  const [layout, setLayout] = useStudioLayout()
  const [grid, setGrid] = useStoredSettings(GRID_KEY, sanitizeGrid)
  const [options, setOptions] = useStoredSettings(CALCULATION_KEY, sanitizeCalculation)
  const { tubes } = useTubes()
  const store = getTubeStore()

  const [image, setImage] = useState<ReferenceImage | null>(null)
  const [imageError, setImageError] = useState('')
  const [selection, setSelection] = useState<Set<CellKey>>(() => new Set())
  // The sight moves live (cheap); the recipe, which is heavy, follows the settled point.
  const [picked, setPicked] = useState<ImagePoint | null>(null)
  const [settled, setSettled] = useState<ImagePoint | null>(null)
  // While dragging, nothing heavy runs: the recipe waits for a pause or for the release.
  const recipeTimer = useRef(0)
  const latestPick = useRef<ImagePoint | null>(null)
  const followPick = (point: ImagePoint | null) => {
    setPicked(point)
    latestPick.current = point
    clearTimeout(recipeTimer.current) // each move pushes the calculation back: it runs once the finger pauses
    recipeTimer.current = window.setTimeout(() => {
      recipeTimer.current = 0
      setSettled(latestPick.current)
    }, RECIPE_PAUSE_MS)
  }
  const settlePick = (point: ImagePoint | null) => {
    clearTimeout(recipeTimer.current)
    recipeTimer.current = 0
    setSettled(point)
  }
  useEffect(() => () => clearTimeout(recipeTimer.current), [])
  const [charts, setCharts] = useState<ChartsState>({ open: false, tab: ChartsTab.Import, group: ALL_GROUPS })
  const [clearSignal, setClearSignal] = useState(0)
  const [imagePaintsOpen, setImagePaintsOpen] = useState(false)
  const frameRef = useRef<HTMLDivElement>(null)
  const zoom = useZoomPan(frameRef, MAX_ZOOM)

  const geometry = image ? gridGeometry(grid, image.source.width, image.source.height) : null
  // Cells outside a grid that changed since are simply ignored.
  const cols = geometry?.cols ?? 0
  const rows = geometry?.rows ?? 0
  const visibleSelection = useMemo(
    () =>
      new Set(
        [...selection].filter((key) => {
          const [c, r] = parseCellKey(key)
          return c < cols && r < rows
        }),
      ),
    [selection, cols, rows],
  )

  const target = useMemo(() => (image && picked ? pixelAt(image, picked.x, picked.y) : null), [image, picked])
  const recipeTarget = useMemo(
    () => (image && settled ? pixelAt(image, settled.x, settled.y) : null),
    [image, settled],
  )
  const recipe = useMemo(
    () => (section === ImageStudySection.Picker ? computeRecipe(recipeTarget, tubes, options) : null),
    [section, recipeTarget, tubes, options],
  )
  const candidates = useMemo(() => adviceCandidates(tubes, options), [tubes, options])

  const tabs: StudioTab<ImageStudySection>[] = Object.values(ImageStudySection).map((id) => ({
    id,
    label: t(`imageStudy.tabs.${id}`),
    icon: TAB_ICONS[id],
  }))
  const goTo = (next: ImageStudySection) => {
    if (next !== section) void navigate(`${AppRoute.ImageStudy}/${next}`, { replace: true })
  }

  const loadImage = async (file: File | undefined) => {
    if (!file) return
    if (!isImageFile(file)) {
      setImageError(t('imageStudy.image.notImage'))
      return
    }
    try {
      const img = await loadImageFile(file)
      setImage(createReferenceImage(img, file.name))
      setImageError('')
      setSelection(new Set())
      setPicked(null)
      setSettled(null)
      setSettled(null)
      zoom.reset()
    } catch {
      setImageError(t('imageStudy.image.unreadable'))
    }
  }

  const toggleCell = (c: number, r: number) => {
    const key = cellKey(c, r)
    const next = new Set(visibleSelection)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    setSelection(next)
  }

  const exportView = async () => {
    if (!image) return
    const canvas = renderView(image, section, grid)
    const blob = await canvasToPng(canvas)
    await saveFile(blob, {
      suggestedName: `${image.name}${EXPORT_SUFFIX[section]}.png`,
      mimeType: 'image/png',
      extensions: ['.png'],
      description: 'PNG',
    })
  }

  const onExportCells = async (cells: (readonly [number, number])[] | 'all') => {
    if (!image || !geometry) return false
    try {
      const file = await exportCells(
        image.source,
        geometry,
        cells === 'all' ? allCells(geometry) : cells,
        image.name,
        t('imageStudy.cells.zipName'),
        canvasToPng,
      )
      if (file)
        await saveFile(file.blob, {
          suggestedName: file.fileName,
          mimeType: file.mimeType,
          extensions: [file.extension],
          description: file.extension.slice(1).toUpperCase(),
        })
      return true
    } catch {
      return false
    }
  }

  const onStatus = (ids: readonly string[], status: TubeStatus) =>
    store.update((list) => setStatus(list, new Set(ids), status))

  const clearCache = () => {
    setImage(null)
    setSelection(new Set())
    setPicked(null)
    setSettled(null)
    setImagePaintsOpen(false)
    zoom.reset()
    setClearSignal((n) => n + 1)
  }

  const wipe = () => {
    store.update(() => [])
    try {
      for (const key of IMAGE_STUDY_KEYS) localStorage.removeItem(STORAGE_PREFIX + key)
      localStorage.removeItem(LEGACY_TUBES_KEY)
    } catch {
      // storage unavailable: nothing was kept anyway
    }
    setGrid(() => sanitizeGrid(null))
    setOptions(() => DEFAULT_CALCULATION_OPTIONS)
    setLayout(defaultLayout())
    clearCache()
  }

  const info = image
    ? image.originalWidth === image.source.width
      ? t('imageStudy.image.info', {
          name: image.fileName,
          width: image.originalWidth,
          height: image.originalHeight,
        })
      : t('imageStudy.image.infoReduced', {
          name: image.fileName,
          width: image.originalWidth,
          height: image.originalHeight,
          w: image.source.width,
          h: image.source.height,
        })
    : ''

  const stage = (
    <>
      <ImageStage
        image={image}
        mode={section}
        grid={grid}
        selection={visibleSelection}
        picked={picked}
        zoom={zoom}
        frameRef={frameRef}
        onPick={followPick}
        onPickEnd={settlePick}
        onToggleCell={toggleCell}
        onFile={(file) => void loadImage(file)}
      />
      {imageError ? (
        <p role="alert" className="rounded-md border border-bad bg-bad-bg px-3 py-2.5 text-sm text-bad">
          {imageError}
        </p>
      ) : null}
      {/* Phones: one row of icon buttons (the names stay as labels and tooltips); text elsewhere. */}
      <div className="flex flex-wrap items-center justify-center gap-2 max-sm:flex-nowrap max-sm:gap-1.5">
        <label
          title={image ? t('imageStudy.image.change') : t('imageStudy.image.choose')}
          className={`${image ? BUTTON_GHOST : BUTTON} cursor-pointer gap-2 ${image ? IMAGE_ACTION : ''}`}
        >
          <ActionIcon d="M4 16l4-4 3 3 5-6 4 5M4 5h16v14H4z" />
          <span className={image ? 'max-sm:sr-only' : ''}>
            {image ? t('imageStudy.image.change') : t('imageStudy.image.choose')}
          </span>
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              void loadImage(e.target.files?.[0])
              e.target.value = ''
            }}
          />
        </label>
        {image ? (
          <>
            <button
              type="button"
              title={t('imageStudy.image.export')}
              onClick={() => void exportView()}
              className={`${BUTTON_GHOST} gap-2 ${IMAGE_ACTION}`}
            >
              <ActionIcon d="M12 4v11M7 10l5 5 5-5M5 20h14" />
              <span className="max-sm:sr-only">{t('imageStudy.image.export')}</span>
            </button>
            <button
              type="button"
              title={t('imageStudy.image.paintsOfImage')}
              onClick={() => setImagePaintsOpen(true)}
              className={`${BUTTON_GHOST} gap-2 ${IMAGE_ACTION}`}
            >
              <ActionIcon d="M12 3a9 9 0 1 0 0 18c1 0 1.6-.8 1.6-1.6 0-.9-.6-1.3-.6-2.1 0-.9.7-1.6 1.6-1.6H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3zM7.5 11h.01M10 7h.01M15 7h.01" />
              <span className="max-sm:sr-only">{t('imageStudy.image.paintsOfImage')}</span>
            </button>
          </>
        ) : null}
      </div>
      {info ? (
        <p title={info} className="text-center text-[13px] text-muted max-sm:truncate max-sm:text-xs">
          {info}
        </p>
      ) : null}
    </>
  )

  const navigation = <NavigationPanel image={image} zoom={zoom} maxZoom={MAX_ZOOM} frameRef={frameRef} />
  const panels =
    section === ImageStudySection.Grid ? (
      <>
        <GridPanel
          grid={grid}
          onGrid={setGrid}
          rows={geometry?.rows ?? null}
          originalWidth={image?.originalWidth ?? null}
        />
        <GridStylePanel grid={grid} onGrid={setGrid} />
        <CellsPanel
          size={geometry ? { cols: geometry.cols, rows: geometry.rows } : null}
          selection={visibleSelection}
          onSelection={setSelection}
          onExport={onExportCells}
        />
        {navigation}
      </>
    ) : section === ImageStudySection.Picker && recipe ? (
      <>
        <RecipePanel
          target={recipeTarget}
          state={recipe}
          options={options}
          candidates={candidates}
          onStatus={onStatus}
          onOpenPaints={() => goTo(ImageStudySection.Paints)}
          onImportChart={() => {
            setCharts({ open: true, tab: ChartsTab.Import, group: ALL_GROUPS })
            goTo(ImageStudySection.Paints)
          }}
        />
        <TargetPanel target={target} point={picked} />
        {navigation}
      </>
    ) : (
      navigation
    )

  return (
    <PageShell
      title={t('imageStudy.title')}
      breadcrumbs={[{ label: t('app.name'), to: AppRoute.Home }, { label: t('imageStudy.title') }]}
      width={PageWidth.Full}
    >
      <h1 className="sr-only">{t('imageStudy.title')}</h1>
      <StudioFrame
        tabs={tabs}
        activeTab={section}
        onSelectTab={goTo}
        layout={layout}
        onLayout={setLayout}
        showLayout={showsImage}
      >
        {showsImage ? (
          <Dashboard layout={layout} stage={stage} panels={panels} stageLabel={t('imageStudy.image.label')} />
        ) : null}
        {section === ImageStudySection.Paints ? (
          <PaintsView options={options} charts={charts} onCharts={setCharts} clearSignal={clearSignal} />
        ) : null}
        {section === ImageStudySection.Settings ? (
          <SettingsView
            options={options}
            onOptions={(next) => setOptions(() => next)}
            tubes={tubes}
            grid={grid}
            storageBytes={storageUsed([TUBES_KEY, ...IMAGE_STUDY_KEYS.map((key) => STORAGE_PREFIX + key)])}
            onRestore={(backup) => {
              store.update(() => backup.tubes)
              if (backup.grid) {
                const restored = backup.grid
                setGrid(() => restored)
              }
            }}
            onClearCache={clearCache}
            onWipe={wipe}
          />
        ) : null}
      </StudioFrame>
      <ImagePaintsDialog
        open={imagePaintsOpen}
        onClose={() => setImagePaintsOpen(false)}
        image={image}
        tubes={tubes}
        options={options}
        onStatus={onStatus}
      />
    </PageShell>
  )
}
