import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { MannequinSettings } from './mannequin-settings'
import { CAMERA_ELEVATION, clamp, dragOrbit } from './pose-math'
import type { Pose } from './poses'
import { MannequinScene } from './scene/mannequin-scene'

/** Whether this browser can draw WebGL (checked once). */
function webglAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'))
  } catch {
    return false
  }
}

interface MannequinStageProps {
  readonly settings: MannequinSettings
  readonly pose: Pose
  /** Camera angles to move to; a new object each time a view is asked for. */
  readonly view: { readonly azimuth: number; readonly elevation: number } | null
  /** Receives the scene once ready (export), null when it goes. */
  readonly onScene?: (scene: MannequinScene | null) => void
  /** Shown over the picture (timer). */
  readonly overlay?: ReactNode
}

interface Pointer {
  x: number
  y: number
}

/** The 3D mannequin: drag to turn around, two fingers or the wheel to zoom, arrow keys to turn. */
export function MannequinStage({ settings, pose, view, onScene, overlay }: MannequinStageProps) {
  const { t } = useTranslation()
  const [supported] = useState(webglAvailable)
  const frameRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneRef = useRef<MannequinScene | null>(null)
  const pointers = useRef(new Map<number, Pointer>())
  const pinch = useRef<{ gap: number; distance: number } | null>(null)
  const initial = useRef({ settings, onScene })

  // Create the scene once; follow the frame size and the page backdrop.
  useEffect(() => {
    const canvas = canvasRef.current
    const frame = frameRef.current
    if (!supported || !canvas || !frame) return
    const { settings: first, onScene: announce } = initial.current
    let scene: MannequinScene
    try {
      scene = new MannequinScene(canvas, first)
    } catch {
      return // WebGL refused at the last moment: the frame stays empty
    }
    sceneRef.current = scene
    announce?.(scene)
    const backdrop = () => {
      const rgb = /\d+(\.\d+)?/g
      const [r = 240, g = 240, b = 240] = (getComputedStyle(frame).backgroundColor.match(rgb) ?? []).map(
        Number,
      )
      scene.setBackdrop((0.3 * r + 0.59 * g + 0.11 * b) / 255 > 0.5)
    }
    const resize = () => scene.resize(frame.clientWidth, frame.clientHeight)
    backdrop()
    resize()
    const sizes = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null
    sizes?.observe(frame)
    const themes = new MutationObserver(backdrop)
    themes.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme', 'data-backdrop', 'style'],
    })
    const scheme = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null
    scheme?.addEventListener('change', backdrop)
    return () => {
      sizes?.disconnect()
      themes.disconnect()
      scheme?.removeEventListener('change', backdrop)
      announce?.(null)
      sceneRef.current = null
      scene.dispose()
    }
  }, [supported])

  useEffect(() => {
    sceneRef.current?.setSettings(settings)
  }, [settings])

  useEffect(() => {
    const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
    sceneRef.current?.showPose(pose, reduce)
  }, [pose])

  useEffect(() => {
    if (!view) return
    sceneRef.current?.setCamera(view.azimuth, view.elevation)
    sceneRef.current?.refit()
  }, [view])

  // The wheel zooms (a non-passive listener, so the page doesn't scroll).
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      sceneRef.current?.zoom(Math.exp(e.deltaY * (e.deltaMode ? 0.05 : 0.0015)))
    }
    canvas.addEventListener('wheel', onWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', onWheel)
  }, [supported])

  const onPointerDown = (e: PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const [a, b] = [...pointers.current.values()]
    if (a && b && sceneRef.current)
      pinch.current = { gap: Math.hypot(a.x - b.x, a.y - b.y) || 1, distance: sceneRef.current.distance }
  }
  const onPointerMove = (e: PointerEvent<HTMLCanvasElement>) => {
    const p = pointers.current.get(e.pointerId)
    const scene = sceneRef.current
    if (!p || !scene) return
    const dx = e.clientX - p.x
    const dy = e.clientY - p.y
    p.x = e.clientX
    p.y = e.clientY
    const [a, b] = [...pointers.current.values()]
    if (a && b && pinch.current) {
      const gap = Math.hypot(a.x - b.x, a.y - b.y) || 1
      scene.setDistance((pinch.current.distance * pinch.current.gap) / gap)
      return
    }
    const { azimuth, elevation } = scene.camera
    scene.setCamera(...dragOrbit(azimuth, elevation, dx, dy))
  }
  const onPointerEnd = (e: PointerEvent<HTMLCanvasElement>) => {
    pointers.current.delete(e.pointerId)
    if (pointers.current.size < 2) pinch.current = null
  }
  const onKeyDown = (e: KeyboardEvent<HTMLCanvasElement>) => {
    const scene = sceneRef.current
    if (!scene) return
    const turn = { ArrowLeft: [-10, 0], ArrowRight: [10, 0], ArrowUp: [0, 5], ArrowDown: [0, -5] }[e.key]
    if (turn) {
      e.preventDefault()
      e.stopPropagation() // arrows on the mannequin turn it; elsewhere they change pose
      const { azimuth, elevation } = scene.camera
      scene.setCamera(
        azimuth + (turn[0] ?? 0),
        clamp(elevation + (turn[1] ?? 0), CAMERA_ELEVATION.min, CAMERA_ELEVATION.max),
      )
    } else if (e.key === '+' || e.key === '=') {
      e.preventDefault()
      scene.zoom(1 / 1.2)
    } else if (e.key === '-') {
      e.preventDefault()
      scene.zoom(1.2)
    }
  }

  return (
    <div
      ref={frameRef}
      className="relative grid min-h-[320px] place-items-center overflow-hidden rounded-lg border border-line bg-paper max-sm:aspect-[3/4] sm:h-[min(70vh,760px)]"
    >
      {supported ? (
        <canvas
          ref={canvasRef}
          tabIndex={0}
          aria-label={t('mannequin.canvas')}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
          onKeyDown={onKeyDown}
          className="absolute inset-0 size-full cursor-grab touch-none outline-none focus-visible:shadow-[inset_0_0_0_2px_var(--color-ink)]"
        />
      ) : (
        <p role="alert" className="max-w-sm p-6 text-center text-muted">
          {t('mannequin.noWebgl')}
        </p>
      )}
      {overlay}
    </div>
  )
}
