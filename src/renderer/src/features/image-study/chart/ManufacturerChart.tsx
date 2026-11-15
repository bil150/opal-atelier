import { useEffect, useRef, useState, type DragEvent, type KeyboardEvent, type PointerEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { BUTTON, TOOL_BUTTON } from '@renderer/components/ui/buttons'
import { averageColor, rgbCss, rgbToHex } from '@renderer/lib/pixels'
import type { Rgb } from '@renderer/lib/paint-mixer'
import { drawSight } from '../view/draw-overlay'
import { isImageFile, isPdfFile, loadImageFile, shrinkToCanvas } from '../view/image-file'
import { useZoomPan, viewTransform } from '../view/use-zoom-pan'
import { zoomLabel, type PointerPosition } from '../view/zoom-math'
import { PDF_MAX_BYTES, PdfChart, PdfError, type RenderedPage } from './pdf-chart'
import { zoneFrom, zoneLines } from './zone-text'

/** Average of a 5 × 5 square: photos and scans have grain. */
const SAMPLE_RADIUS = 2
const MAX_ZOOM = 8

const PDF_ERRORS = new Map<string, 'imageStudy.chart.password' | 'imageStudy.chart.invalid'>([
  [PdfError.Password, 'imageStudy.chart.password'],
  [PdfError.Invalid, 'imageStudy.chart.invalid'],
])

interface ManufacturerChartProps {
  /** A colour read on the chart goes into the tube being added (a new one starts if needed). */
  readonly onColour: (rgb: Rgb) => void
  /** Text read in a zone, as lines; returns what was recognised, for the message. */
  readonly onZoneText: (lines: readonly string[]) => string | null
  readonly wide: boolean
  readonly onWide: (wide: boolean) => void
}

interface Pointer extends PointerPosition {
  readonly startX: number
  readonly startY: number
  moved: boolean
  zone: boolean
}

/**
 * The manufacturer's chart (image or PDF), loaded once for every tube added. Never stored.
 * A click reads the colour; a drag pans the zoomed chart or, in zone mode, draws an area whose PDF
 * text fills in the tube being added.
 */
export function ManufacturerChart({ onColour, onZoneText, wide, onWide }: ManufacturerChartProps) {
  const { t, i18n } = useTranslation()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [source, setSource] = useState<HTMLCanvasElement | null>(null)
  const [pdf, setPdf] = useState<{ chart: PdfChart; page: number; rendered: RenderedPage | null } | null>(
    null,
  )
  const [point, setPoint] = useState<{ x: number; y: number } | null>(null)
  const [probe, setProbe] = useState<Rgb | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [zoneMode, setZoneMode] = useState(false)
  const [zoneMessage, setZoneMessage] = useState('')
  const [zoneBox, setZoneBox] = useState<{ left: number; top: number; width: number; height: number } | null>(
    null,
  )
  const frameRef = useRef<HTMLDivElement>(null)
  const zoom = useZoomPan(frameRef, MAX_ZOOM)
  const pointers = useRef(new Map<number, Pointer>())
  const pinch = useRef<ReturnType<typeof zoom.startPinch> | null>(null)
  const token = useRef(0)

  // A PDF is released when replaced or when the chart goes ("clear the cache" remounts it).
  const chart = pdf?.chart
  useEffect(() => () => chart?.destroy(), [chart])

  // Draw the chart and the sight; the sight keeps its size on screen whatever the zoom.
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx || !source) return
    canvas.width = source.width
    canvas.height = source.height
    ctx.drawImage(source, 0, 0)
    if (point) {
      const shown = canvas.offsetWidth * zoom.view.zoom
      drawSight(ctx, point.x, point.y, shown > 0 ? Math.max(0.1, canvas.width / shown) : 1)
    }
  }, [source, point, zoom.view.zoom])

  const showPdfPage = async (chart: PdfChart, page: number) => {
    const mine = ++token.current
    const rendered = await chart.renderPage(page)
    if (mine !== token.current) return // another PDF or page was asked for meanwhile
    setPdf({ chart, page, rendered })
    setSource(rendered.canvas)
    setPoint(null)
    zoom.reset()
  }

  const load = async (file: File | undefined) => {
    if (!file) return
    setError('')
    if (isPdfFile(file)) {
      if (file.size > PDF_MAX_BYTES) {
        setError(t('imageStudy.chart.tooBig'))
        return
      }
      setBusy(true)
      try {
        const chart = await PdfChart.open(file)
        await showPdfPage(chart, 1)
      } catch (e) {
        setError(t(PDF_ERRORS.get(e instanceof Error ? e.message : '') ?? 'imageStudy.chart.unreadable'))
      } finally {
        setBusy(false)
      }
      return
    }
    if (!isImageFile(file)) {
      setError(t('imageStudy.chart.notChart'))
      return
    }
    try {
      const img = await loadImageFile(file)
      setPdf(null)
      setSource(shrinkToCanvas(img))
      setPoint(null)
      zoom.reset()
    } catch {
      setError(t('imageStudy.image.unreadable'))
    }
  }

  const goToPage = (delta: number) => {
    if (!pdf) return
    const page = Math.min(pdf.chart.pageCount, Math.max(1, pdf.page + delta))
    if (page === pdf.page) return
    showPdfPage(pdf.chart, page).catch(() => setError(t('imageStudy.chart.pageUnreadable')))
  }

  const pick = (pt: { x: number; y: number }) => {
    const ctx = source?.getContext('2d', { willReadFrequently: true })
    if (!source || !ctx) return
    const data = ctx.getImageData(0, 0, source.width, source.height).data
    const rgb = averageColor(data, source.width, source.height, pt.x, pt.y, SAMPLE_RADIUS)
    setPoint(pt)
    setProbe(rgb)
    onColour(rgb)
  }

  const imagePoint = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const r = canvas.getBoundingClientRect()
    return {
      x: Math.min(canvas.width - 1, Math.max(0, Math.floor(((clientX - r.left) * canvas.width) / r.width))),
      y: Math.min(canvas.height - 1, Math.max(0, Math.floor(((clientY - r.top) * canvas.height) / r.height))),
    }
  }

  const framePoint = (clientX: number, clientY: number): PointerPosition => {
    const r = frameRef.current?.getBoundingClientRect()
    return { x: clientX - (r?.left ?? 0), y: clientY - (r?.top ?? 0) }
  }

  const readZone = async (a: Pointer, e: PointerEvent) => {
    const zone = zoneFrom(imagePoint(a.startX, a.startY), imagePoint(e.clientX, e.clientY))
    if (!zone) {
      setZoneBox(null)
      return
    }
    if (!pdf?.rendered) {
      setZoneMessage(t('imageStudy.chart.zoneNoText'))
      return
    }
    try {
      const lines = zoneLines(await pdf.rendered.text(), zone)
      const read = onZoneText(lines)
      setZoneMessage(
        read
          ? t('imageStudy.chart.zoneRead', { text: read })
          : lines.length
            ? t('imageStudy.chart.zoneNothing')
            : t('imageStudy.chart.zoneEmpty'),
      )
    } catch {
      setZoneMessage(t('imageStudy.chart.zoneFailed'))
    }
  }

  const onPointerDown = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!source || (e.pointerType === 'mouse' && e.button !== 0) || pointers.current.size >= 2) return
    e.currentTarget.setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, {
      ...framePoint(e.clientX, e.clientY),
      startX: e.clientX,
      startY: e.clientY,
      moved: false,
      zone: zoneMode,
    })
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()] as [Pointer, Pointer]
      a.moved = b.moved = true // two fingers: no longer a click
      a.zone = b.zone = false
      pinch.current = zoom.startPinch(a, b)
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
    if (!p.moved && Math.hypot(e.clientX - p.startX, e.clientY - p.startY) < 5) return // a tremor is still a click
    p.moved = true
    pointers.current.set(e.pointerId, { ...p, ...next, moved: true })
    if (p.zone) {
      const f = frameRef.current?.getBoundingClientRect()
      if (!f) return
      const x0 = Math.max(f.left, Math.min(p.startX, e.clientX))
      const x1 = Math.min(f.right, Math.max(p.startX, e.clientX))
      const y0 = Math.max(f.top, Math.min(p.startY, e.clientY))
      const y1 = Math.min(f.bottom, Math.max(p.startY, e.clientY))
      setZoneBox({ left: x0 - f.left, top: y0 - f.top, width: x1 - x0, height: y1 - y0 })
    } else if (zoom.view.zoom > 1) zoom.pan(dx, dy)
  }
  const onPointerEnd = (e: PointerEvent<HTMLCanvasElement>, cancelled: boolean) => {
    const p = pointers.current.get(e.pointerId)
    if (!p) return
    pointers.current.delete(e.pointerId)
    if (pointers.current.size < 2) pinch.current = null
    if (cancelled) return
    if (p.zone && p.moved) void readZone(p, e)
    else if (!p.moved) pick(imagePoint(e.clientX, e.clientY))
  }

  const onKeyDown = (e: KeyboardEvent<HTMLCanvasElement>) => {
    if (!source) return
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
    const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key]
    if (!d) return
    e.preventDefault()
    const k = e.shiftKey ? 10 : 1
    const from = point ?? { x: Math.floor(source.width / 2), y: Math.floor(source.height / 2) }
    const next = {
      x: Math.min(source.width - 1, Math.max(0, from.x + (d[0] ?? 0) * k)),
      y: Math.min(source.height - 1, Math.max(0, from.y + (d[1] ?? 0) * k)),
    }
    pick(next)
    zoom.reveal(next.x / source.width, next.y / source.height)
  }

  const onWheel = (e: React.WheelEvent) => {
    if (!source) return
    const r = frameRef.current?.getBoundingClientRect()
    if (!r) return
    if (e.ctrlKey || e.metaKey)
      zoom.zoomAround(Math.exp(-e.deltaY * 0.01), e.clientX - r.left, e.clientY - r.top)
    else if (zoom.view.zoom > 1) zoom.pan(e.shiftKey ? -e.deltaY : -e.deltaX, e.shiftKey ? 0 : -e.deltaY)
  }

  // Keep page scroll from also happening when the wheel zooms or pans the chart.
  useEffect(() => {
    const frame = frameRef.current
    if (!frame) return
    const stop = (e: WheelEvent) => {
      if (source && (e.ctrlKey || e.metaKey || zoom.view.zoom > 1)) e.preventDefault()
    }
    frame.addEventListener('wheel', stop, { passive: false })
    return () => frame.removeEventListener('wheel', stop)
  }, [source, frameRef, zoom.view.zoom])

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    void load(e.dataTransfer.files[0])
  }

  const zoneHelp = zoneMode ? (pdf ? t('imageStudy.chart.zoneHelp') : t('imageStudy.chart.zonePdfOnly')) : ''
  const icon = 'size-[18px] fill-none stroke-current stroke-2 [stroke-linecap:round] [stroke-linejoin:round]'

  return (
    <section
      aria-label={t('imageStudy.chart.title')}
      className="flex min-w-0 flex-col gap-3 rounded-lg border border-line bg-paper-2 p-4"
    >
      <h2 className="font-semibold">{t('imageStudy.chart.title')}</h2>
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        className="grid min-h-[220px] place-items-center overflow-hidden rounded-lg border border-dashed border-line bg-paper"
      >
        {source ? (
          <div
            ref={frameRef}
            onWheel={onWheel}
            className={`relative w-full overflow-hidden ${zoom.view.zoom > 1 ? 'cursor-grab' : ''}`}
            style={{ aspectRatio: `${source.width} / ${source.height}` }}
          >
            <canvas
              ref={canvasRef}
              tabIndex={0}
              aria-label={t('imageStudy.chart.canvas')}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={(e) => onPointerEnd(e, false)}
              onPointerCancel={(e) => onPointerEnd(e, true)}
              onKeyDown={onKeyDown}
              className={`block size-full origin-top-left touch-none select-none ${zoneMode ? 'cursor-crosshair' : 'cursor-pointer'}`}
              style={{ transform: viewTransform(zoom.view) }}
            />
            {zoneBox ? (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute border-2 border-dashed border-ink bg-ink/10"
                style={zoneBox}
              />
            ) : null}
          </div>
        ) : (
          <div className="p-6 text-center">
            <p className="font-semibold">{t('imageStudy.chart.drop')}</p>
            <p className="text-muted">{t('imageStudy.chart.dropHint')}</p>
          </div>
        )}
      </div>
      {error ? (
        <p role="alert" className="rounded-md border border-bad bg-bad-bg px-3 py-2.5 text-sm text-bad">
          {error}
        </p>
      ) : null}
      {zoneMessage || zoneHelp ? (
        <p aria-live="polite" className="text-[13px] text-muted">
          {zoneMessage || zoneHelp}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <label className={`${BUTTON} cursor-pointer`}>
          {source ? t('imageStudy.chart.change') : t('imageStudy.chart.choose')}
          <input
            type="file"
            accept="image/*,application/pdf,.pdf"
            className="sr-only"
            onChange={(e) => {
              void load(e.target.files?.[0])
              e.target.value = ''
            }}
          />
        </label>
        {pdf && pdf.chart.pageCount > 1 ? (
          <span role="group" aria-label={t('imageStudy.chart.pages')} className="flex items-center gap-1.5">
            <button
              type="button"
              aria-label={t('imageStudy.chart.previous')}
              disabled={pdf.page <= 1}
              onClick={() => goToPage(-1)}
              className={TOOL_BUTTON}
            >
              ‹
            </button>
            <span aria-live="polite" className="text-sm tabular-nums">
              {pdf.page} / {pdf.chart.pageCount}
            </span>
            <button
              type="button"
              aria-label={t('imageStudy.chart.nextPage')}
              disabled={pdf.page >= pdf.chart.pageCount}
              onClick={() => goToPage(1)}
              className={TOOL_BUTTON}
            >
              ›
            </button>
          </span>
        ) : null}
        {source ? (
          <span role="group" aria-label={t('imageStudy.chart.zoom')} className="flex items-center gap-1.5">
            <button
              type="button"
              aria-label={t('imageStudy.chart.zoomOut')}
              disabled={zoom.view.zoom <= 1}
              onClick={() => zoom.zoomBy(1 / 1.5)}
              className={TOOL_BUTTON}
            >
              −
            </button>
            <button
              type="button"
              aria-label={t('imageStudy.chart.fit')}
              onClick={zoom.reset}
              className={TOOL_BUTTON}
            >
              {zoomLabel(zoom.view.zoom, i18n.resolvedLanguage ?? 'en')}
            </button>
            <button
              type="button"
              aria-label={t('imageStudy.chart.zoomIn')}
              disabled={zoom.view.zoom >= MAX_ZOOM}
              onClick={() => zoom.zoomBy(1.5)}
              className={TOOL_BUTTON}
            >
              +
            </button>
          </span>
        ) : null}
        <button
          type="button"
          aria-pressed={zoneMode}
          aria-label={t('imageStudy.chart.zone')}
          title={t('imageStudy.chart.zoneTitle')}
          onClick={() => {
            setZoneMode(!zoneMode)
            setZoneBox(null)
            setZoneMessage('')
          }}
          className={TOOL_BUTTON}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className={icon}>
            <path d="M4 7V4h3M17 4h3v3M20 17v3h-3M7 20H4v-3" />
            <path d="M8 9h8M8 12h8M8 15h5" />
          </svg>
        </button>
        {source ? (
          <button
            type="button"
            aria-pressed={wide}
            aria-label={t('imageStudy.chart.wide')}
            title={t('imageStudy.chart.wide')}
            onClick={() => onWide(!wide)}
            className={TOOL_BUTTON}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className={icon}>
              <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
            </svg>
          </button>
        ) : null}
        {/* Live region always present, so the colour read is announced; the swatch only once there is one. */}
        <span aria-live="polite" className="ml-auto flex items-center gap-2 font-mono text-sm">
          {probe && !busy ? (
            <span
              aria-hidden="true"
              className="size-6 rounded border border-line"
              style={{ background: rgbCss(probe) }}
            />
          ) : null}
          {busy ? t('imageStudy.chart.reading') : probe ? rgbToHex(probe) : ''}
        </span>
      </div>
    </section>
  )
}
