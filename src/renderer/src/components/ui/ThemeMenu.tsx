import { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BACKDROPS, BACKDROP_SWATCH, setBackdrop, useBackdrop, type Backdrop } from '@renderer/theme/backdrop'

function Swatch({ backdrop }: { readonly backdrop: Backdrop }) {
  const [paper, ink] = BACKDROP_SWATCH[backdrop]
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="size-[18px] flex-none">
      <circle cx="10" cy="10" r="8.5" fill={paper} stroke="currentColor" strokeWidth="1" />
      <path d="M10 1.5a8.5 8.5 0 0 1 0 17z" fill={ink} />
    </svg>
  )
}

/** The page theme, discreetly: one button with the current swatch, opening the list of themes. */
export function ThemeMenu() {
  const { t } = useTranslation()
  const backdrop = useBackdrop()
  const [open, setOpen] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)
  const listId = useId()
  const name = t(`studio.backdrops.${backdrop}`)

  // Escape or a click elsewhere closes the list.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    const onPointer = (e: PointerEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointer)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointer)
    }
  }, [open])

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={t('studio.backdropCurrent', { name })}
        title={t('studio.backdropCurrent', { name })}
        onClick={() => setOpen(!open)}
        className="inline-grid size-9 place-items-center rounded-lg border border-line bg-paper-2 text-muted hover:border-ink hover:text-ink aria-expanded:border-ink"
      >
        <Swatch backdrop={backdrop} />
      </button>
      {open ? (
        <div
          id={listId}
          role="group"
          aria-label={t('studio.backdrop')}
          className="absolute top-full right-0 z-50 mt-2 flex w-48 flex-col gap-0.5 rounded-xl border border-line bg-paper-2 p-1.5 shadow-[0_12px_28px_-12px_rgb(0_0_0/.35)]"
        >
          {BACKDROPS.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={option === backdrop}
              onClick={() => {
                setBackdrop(option)
                setOpen(false)
              }}
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-ink hover:bg-highlight aria-pressed:font-semibold"
            >
              <Swatch backdrop={option} />
              <span className="flex-1">{t(`studio.backdrops.${option}`)}</span>
              {option === backdrop ? (
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  className="size-4 fill-none stroke-current stroke-2 [stroke-linecap:round] [stroke-linejoin:round]"
                >
                  <path d="M5 13l4 4L19 7" />
                </svg>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
