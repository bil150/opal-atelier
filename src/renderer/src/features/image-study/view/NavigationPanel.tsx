import { useEffect, useRef, type PointerEvent, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { Panel } from '@renderer/components/ui/Panel'
import { TOOL_BUTTON } from '@renderer/components/ui/buttons'
import type { ReferenceImage } from './reference-image'
import type { ZoomPan } from './use-zoom-pan'
import { zoomLabel } from './zoom-math'

/** Largest side of the thumbnail, in CSS pixels. */
const THUMB_SIDE = 220

interface NavigationPanelProps {
  readonly image: ReferenceImage | null
  readonly zoom: ZoomPan
  readonly maxZoom: number
  /** The image frame: the visible part is drawn on the thumbnail from its size. */
  readonly frameRef: RefObject<HTMLElement | null>
}

/** Thumbnail with the visible part outlined (tap or drag to move there), and zoom buttons. */
export function NavigationPanel({ image, zoom, maxZoom, frameRef }: NavigationPanelProps) {
  const { t, i18n } = useTranslation()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dragging = useRef(false)
  const { view } = zoom

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx || !image) return
    const { width, height } = image.source
    const k = THUMB_SIDE / Math.max(width, height)
    canvas.width = Math.max(1, Math.round(width * k))
    canvas.height = Math.max(1, Math.round(height * k))
    ctx.drawImage(image.source, 0, 0, canvas.width, canvas.height)
    if (view.zoom <= 1) return
    const frame = frameRef.current
    const fw = Math.max(1, frame?.clientWidth ?? 1)
    const fh = Math.max(1, frame?.clientHeight ?? 1)
    const x = (-view.tx / (view.zoom * fw)) * canvas.width
    const y = (-view.ty / (view.zoom * fh)) * canvas.height
    const w = canvas.width / view.zoom
    const h = canvas.height / view.zoom
    ctx.fillStyle = 'rgba(0,0,0,0.35)'
    ctx.beginPath()
    ctx.rect(0, 0, canvas.width, canvas.height)
    ctx.rect(x, y, w, h)
    ctx.fill('evenodd')
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2
    ctx.strokeRect(x, y, w, h)
  }, [image, view, frameRef])

  const moveTo = (e: PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    zoom.centreOn((e.clientX - r.left) / (r.width || 1), (e.clientY - r.top) / (r.height || 1))
  }

  return (
    <Panel title={t('imageStudy.nav.title')}>
      {image ? (
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={t('imageStudy.nav.map')}
          title={t('imageStudy.nav.map')}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId)
            dragging.current = true
            moveTo(e)
          }}
          onPointerMove={(e) => {
            if (dragging.current) moveTo(e)
          }}
          onPointerUp={() => (dragging.current = false)}
          onPointerCancel={() => (dragging.current = false)}
          className="max-h-[220px] max-w-full cursor-pointer touch-none self-center rounded-md border border-line"
        />
      ) : (
        <p className="text-[13px] text-muted">{t('imageStudy.nav.empty')}</p>
      )}
      <div
        role="group"
        aria-label={t('imageStudy.nav.zoom')}
        className="flex items-center justify-center gap-1.5"
      >
        <button
          type="button"
          aria-label={t('imageStudy.nav.zoomOut')}
          title={t('imageStudy.nav.zoomOut')}
          disabled={!image || view.zoom <= 1}
          onClick={() => zoom.zoomBy(1 / 1.5)}
          className={`${TOOL_BUTTON} min-w-9`}
        >
          −
        </button>
        <button
          type="button"
          aria-label={t('imageStudy.nav.fit')}
          title={t('imageStudy.nav.fit')}
          disabled={!image}
          onClick={zoom.reset}
          className={`${TOOL_BUTTON} min-w-16 tabular-nums`}
        >
          {zoomLabel(view.zoom, i18n.resolvedLanguage ?? 'en')}
        </button>
        <button
          type="button"
          aria-label={t('imageStudy.nav.zoomIn')}
          title={t('imageStudy.nav.zoomIn')}
          disabled={!image || view.zoom >= maxZoom}
          onClick={() => zoom.zoomBy(1.5)}
          className={`${TOOL_BUTTON} min-w-9`}
        >
          +
        </button>
      </div>
    </Panel>
  )
}
