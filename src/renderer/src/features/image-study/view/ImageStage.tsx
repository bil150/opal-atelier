import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
  type PointerEvent,
  type RefObject,
} from 'react'
import { useTranslation } from 'react-i18next'
import type { CellKey } from '../grid/cell-refs'
import { cellAt, gridGeometry, type GridSettings } from '../grid/grid-settings'
import { ImageStudySection } from '../image-study-settings'
import { drawGrid, drawSight } from './draw-overlay'
import { greyVersion, type ReferenceImage } from './reference-image'
import { viewTransform, type ZoomPan } from './use-zoom-pan'
import type { PointerPosition } from './zoom-math'

export interface ImagePoint {
  readonly x: number
  readonly y: number
}

interface ImageStageProps {
  readonly image: ReferenceImage | null
  readonly mode: ImageStudySection
  readonly grid: GridSettings
  readonly selection: ReadonlySet<CellKey>
  readonly picked: ImagePoint | null
  readonly zoom: ZoomPan
  /** The frame the zoom works in (the same ref given to useZoomPan). */
  readonly frameRef: RefObject<HTMLDivElement | null>
  /** The sight follows the pointer: called on every move (keep it light). */
  readonly onPick: (point: ImagePoint | null) => void
  /** The point is settled (pointer released, arrow key): time for heavy work such as the recipe. */
  readonly onPickEnd: (point: ImagePoint | null) => void
  readonly onToggleCell: (column: number, row: number) => void
  readonly onFile: (file: File | undefined) => void
}

interface Pointer extends PointerPosition {
  readonly startX: number
  readonly startY: number
  moved: boolean
  /** Panning (middle button, or a drag outside the picker). */
  readonly pan: boolean
}

/** On wide screens the image area fills the window; on phones it is at most 80 % of the screen height. */
/** Limits of the screen-resolution drawing: at most 8 × the image, and 16 megapixels. */
const MAX_UPSCALE = 8
const MAX_CANVAS_PIXELS = 16_000_000

const FILL_QUERY = '(min-width: 641px) and (min-height: 560px)'

/**
 * The reference image. It always fits its area whole; zoom and pan are a CSS transform (nothing is
 * redrawn), the picker always reads the original pixels. Picker: a tap sets the point, a drag refines it,
 * hovering changes nothing. Grid and values: zoomed, a drag pans. Everywhere: two fingers zoom and pan,
 * the middle mouse button pans.
 */
export function ImageStage({
  image,
  mode,
  grid,
  selection,
  picked,
  zoom,
  frameRef,
  onPick,
  onPickEnd,
  onToggleCell,
  onFile,
}: ImageStageProps) {
  const { t } = useTranslation()
  const areaRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [frameSize, setFrameSize] = useState<{ width: number; height: number } | null>(null)
  const pointers = useRef(new Map<number, Pointer>())
  const pinch = useRef<ReturnType<ZoomPan['startPinch']> | null>(null)
  const pickBefore = useRef<ImagePoint | null>(null)
  const dragging = useRef(false)
  const lastPick = useRef<ImagePoint | null>(null)
  const suppressClick = useRef(false)
  const { refit } = zoom

  // Frame size: the largest box of the image's proportions that fits the area.
  useLayoutEffect(() => {
    const area = areaRef.current
    if (!area || !image) {
      setFrameSize(null)
      return
    }
    const fit = () => {
      const fill = typeof matchMedia === 'function' && matchMedia(FILL_QUERY).matches
      const availW = area.clientWidth
      // Wide screens and phones give the area a fixed height; tablets in portrait, up to 80 % of the screen.
      const phone = typeof matchMedia === 'function' && matchMedia('(max-width: 640px)').matches
      const availH = fill || phone ? area.clientHeight : Math.round(innerHeight * 0.8)
      const ratio = image.source.width / image.source.height
      const w = Math.max(1, Math.min(availW || image.source.width, (availH || image.source.height) * ratio))
      setFrameSize({ width: Math.floor(w), height: Math.floor(w / ratio) })
    }
    fit()
    if (typeof ResizeObserver !== 'function') return
    const observer = new ResizeObserver(() => requestAnimationFrame(fit))
    observer.observe(area)
    return () => observer.disconnect()
  }, [image])

  useEffect(refit, [frameSize, refit])

  // Draw: the image (or its values), the grid, the sight. Lines keep their width on screen at any zoom.
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx || !image) return
    const { width, height } = image.source
    const shown = (frameSize?.width ?? width) * zoom.view.zoom // CSS pixels across the image
    // An image shown larger than it is gets drawn at screen resolution, so the grid can be one screen pixel thin.
    const budget = Math.sqrt(MAX_CANVAS_PIXELS / (width * height))
    const k = Math.max(1, Math.min(MAX_UPSCALE, budget, (shown * (devicePixelRatio || 1)) / width))
    canvas.width = Math.round(width * k)
    canvas.height = Math.round(height * k)
    ctx.setTransform(k, 0, 0, k, 0, 0)
    ctx.imageSmoothingEnabled = (zoom.view.zoom * (frameSize?.width ?? width)) / width <= 2 // big zoom: crisp pixels
    ctx.clearRect(0, 0, width, height)
    ctx.drawImage(mode === ImageStudySection.Values ? greyVersion(image) : image.source, 0, 0)
    const scale = width / shown // image pixels per screen pixel
    if (mode === ImageStudySection.Grid)
      drawGrid(ctx, width, height, scale, { grid, selection, showSelection: true }, 1 / k)
    if (mode === ImageStudySection.Picker && picked) drawSight(ctx, picked.x, picked.y, scale)
  }, [image, mode, grid, selection, picked, frameSize, zoom.view.zoom])

  const imagePoint = (clientX: number, clientY: number): ImagePoint => {
    const canvas = canvasRef.current
    if (!canvas || !image) return { x: 0, y: 0 }
    // In image pixels (the canvas may be drawn at a higher resolution).
    const { width, height } = image.source
    const r = canvas.getBoundingClientRect()
    return {
      x: Math.min(width - 1, Math.max(0, Math.floor(((clientX - r.left) * width) / r.width))),
      y: Math.min(height - 1, Math.max(0, Math.floor(((clientY - r.top) * height) / r.height))),
    }
  }
  const framePoint = (clientX: number, clientY: number): PointerPosition => {
    const r = frameRef.current?.getBoundingClientRect()
    return { x: clientX - (r?.left ?? 0), y: clientY - (r?.top ?? 0) }
  }

  const onPointerDown = (e: PointerEvent<HTMLCanvasElement>) => {
    if (
      !image ||
      (e.pointerType === 'mouse' && e.button !== 0 && e.button !== 1) ||
      pointers.current.size >= 2
    )
      return
    e.currentTarget.setPointerCapture(e.pointerId)
    const middle = e.pointerType === 'mouse' && e.button === 1
    if (middle) e.preventDefault()
    pointers.current.set(e.pointerId, {
      ...framePoint(e.clientX, e.clientY),
      startX: e.clientX,
      startY: e.clientY,
      moved: false,
      pan: middle || mode !== ImageStudySection.Picker,
    })
    if (pointers.current.size === 2) {
      // Two fingers: a zoom, not a pick — the first finger didn't move the point after all.
      if (dragging.current) {
        dragging.current = false
        lastPick.current = pickBefore.current
        onPick(pickBefore.current)
      }
      for (const p of pointers.current.values()) p.moved = true
      const [a, b] = [...pointers.current.values()] as [Pointer, Pointer]
      pinch.current = zoom.startPinch(a, b)
      suppressClick.current = true
      return
    }
    if (mode === ImageStudySection.Picker && !middle) {
      pickBefore.current = picked
      dragging.current = true
      lastPick.current = imagePoint(e.clientX, e.clientY)
      onPick(lastPick.current)
    }
  }

  const onPointerMove = (e: PointerEvent<HTMLCanvasElement>) => {
    const p = pointers.current.get(e.pointerId)
    if (!p) return
    const next = framePoint(e.clientX, e.clientY)
    const dx = next.x - p.x
    const dy = next.y - p.y
    pointers.current.set(e.pointerId, { ...p, ...next })
    if (pinch.current && pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()] as [Pointer, Pointer]
      zoom.movePinch(pinch.current, a, b)
      return
    }
    if (dragging.current && !p.pan) {
      lastPick.current = imagePoint(e.clientX, e.clientY)
      onPick(lastPick.current) // picker: refine the point (sight only, nothing heavy)
      return
    }
    if (!p.pan) return
    if (!p.moved && Math.hypot(e.clientX - p.startX, e.clientY - p.startY) < 5) return // a tremor is still a click
    pointers.current.set(e.pointerId, { ...p, ...next, moved: true })
    suppressClick.current = true
    if (zoom.view.zoom > 1) zoom.pan(dx, dy)
  }

  const onPointerEnd = (e: PointerEvent<HTMLCanvasElement>) => {
    pointers.current.delete(e.pointerId)
    if (pointers.current.size < 2) pinch.current = null
    if (!pointers.current.size && dragging.current) {
      dragging.current = false
      onPickEnd(lastPick.current) // released: now the recipe can be computed
    }
  }

  // A click on a cell (grid view) selects or deselects it.
  const onClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (suppressClick.current) {
      suppressClick.current = false // that was a pan, not a choice
      return
    }
    if (mode !== ImageStudySection.Grid || !image) return
    const p = imagePoint(e.clientX, e.clientY)
    const cell = cellAt(gridGeometry(grid, image.source.width, image.source.height), p.x, p.y)
    if (cell) onToggleCell(cell[0], cell[1])
  }

  const onKeyDown = (e: KeyboardEvent<HTMLCanvasElement>) => {
    if (!image) return
    if (e.key === '+' || e.key === '=') {
      e.preventDefault()
      zoom.zoomBy(1.5)
      return
    }
    if (e.key === '-' || e.key === '_') {
      e.preventDefault()
      zoom.zoomBy(1 / 1.5)
      return
    }
    if (e.key === '0') {
      e.preventDefault()
      zoom.reset()
      return
    }
    if (mode !== ImageStudySection.Picker) return
    const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key]
    if (!d) return
    e.preventDefault()
    const k = e.shiftKey ? 10 : 1
    const { width, height } = image.source
    const from = picked ?? { x: Math.floor(width / 2), y: Math.floor(height / 2) }
    const next = {
      x: Math.min(width - 1, Math.max(0, from.x + (d[0] ?? 0) * k)),
      y: Math.min(height - 1, Math.max(0, from.y + (d[1] ?? 0) * k)),
    }
    onPick(next)
    onPickEnd(next)
    zoom.reveal((next.x + 0.5) / width, (next.y + 0.5) / height)
  }

  // Wheel: zoom around the cursor on wide screens (or with Ctrl); zoomed, the wheel pans.
  useEffect(() => {
    const frame = frameRef.current
    if (!frame || !image) return
    const onWheel = (e: WheelEvent) => {
      const r = frame.getBoundingClientRect()
      const fill = typeof matchMedia === 'function' && matchMedia(FILL_QUERY).matches
      if (e.ctrlKey || e.metaKey || fill) {
        e.preventDefault()
        zoom.zoomAround(
          Math.exp(-e.deltaY * (e.deltaMode ? 0.05 : 0.0025)),
          e.clientX - r.left,
          e.clientY - r.top,
        )
      } else if (zoom.view.zoom > 1) {
        e.preventDefault()
        zoom.pan(-e.deltaX, -e.deltaY)
      }
    }
    frame.addEventListener('wheel', onWheel, { passive: false })
    return () => frame.removeEventListener('wheel', onWheel)
  }, [frameRef, image, zoom])

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    onFile(e.dataTransfer.files[0])
  }

  const pixelated = image && frameSize ? (zoom.view.zoom * frameSize.width) / image.source.width > 2 : false

  return (
    <div
      ref={areaRef}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      className="grid min-h-[280px] place-items-center overflow-hidden rounded-lg border border-line bg-paper max-sm:h-auto max-sm:min-h-0 max-sm:flex-1 sm:h-[min(70vh,760px)]"
    >
      {image ? (
        <div
          ref={frameRef}
          className={`relative overflow-hidden ${zoom.view.zoom > 1 ? 'cursor-grab' : ''}`}
          style={frameSize ?? undefined}
        >
          <canvas
            ref={canvasRef}
            tabIndex={mode === ImageStudySection.Picker ? 0 : -1}
            aria-label={t('imageStudy.image.canvas')}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerEnd}
            onPointerCancel={onPointerEnd}
            onClick={onClick}
            onKeyDown={onKeyDown}
            className={`block size-full origin-top-left touch-none select-none outline-none focus-visible:shadow-[0_0_0_2px_var(--color-ink)] ${mode === ImageStudySection.Picker ? 'cursor-crosshair' : mode === ImageStudySection.Grid ? 'cursor-pointer' : ''}`}
            style={{
              transform: viewTransform(zoom.view),
              imageRendering: pixelated ? 'pixelated' : undefined,
            }}
          />
        </div>
      ) : (
        <label className="grid size-full cursor-pointer place-items-center p-6 text-center">
          <span className="font-semibold">{t('imageStudy.image.drop')}</span>
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              onFile(e.target.files?.[0])
              e.target.value = ''
            }}
          />
        </label>
      )}
    </div>
  )
}
