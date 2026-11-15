import { useEffect, useRef, type ReactNode } from 'react'

interface DialogProps {
  readonly open: boolean
  readonly title: string
  readonly closeLabel: string
  readonly onClose: () => void
  readonly children: ReactNode
}

/**
 * Modal window (native <dialog>): Escape and a click on the backdrop close it; focus returns to
 * what opened it.
 */
export function Dialog({ open, title, closeLabel, onClose, children }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const opener = useRef<Element | null>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      opener.current = document.activeElement
      if (typeof dialog.showModal === 'function') dialog.showModal()
      else dialog.setAttribute('open', '') // environments without modal dialogs
    } else if (!open && dialog.open) {
      if (typeof dialog.close === 'function') dialog.close()
      else dialog.removeAttribute('open')
      if (opener.current instanceof HTMLElement && opener.current.isConnected) opener.current.focus()
    }
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      className="m-auto max-h-[90dvh] w-[min(720px,calc(100vw-24px))] overflow-y-auto rounded-2xl border border-line bg-paper-2 p-5 text-ink shadow-[0_12px_32px_rgb(0_0_0/.22)] backdrop:bg-black/40"
    >
      {open ? (
        <div className="flex flex-col gap-3.5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button
              type="button"
              aria-label={closeLabel}
              onClick={onClose}
              className="grid size-8 place-items-center rounded-md border border-line hover:border-ink"
            >
              ✕
            </button>
          </div>
          {children}
        </div>
      ) : null}
    </dialog>
  )
}
