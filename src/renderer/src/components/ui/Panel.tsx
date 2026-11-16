import { useContext, useId, useState, type ReactNode } from 'react'
import { CollapsiblePanels, usePhone } from './panel-collapse'

interface PanelProps {
  readonly title?: ReactNode
  readonly children: ReactNode
  readonly className?: string
  readonly as?: 'div' | 'article'
  /** On phones: unfolded at first? (true for the main panel of a tab; folded otherwise) */
  readonly defaultOpen?: boolean
  /** On phones: called when folded or unfolded. */
  readonly onToggle?: (open: boolean) => void
}

/**
 * Rounded "bento" tile holding a group of settings or information. Around a studio tool's main view, on a
 * phone, its title folds and unfolds it (small / large): folded at first, except the main panel of a tab.
 * On large screens panels are always open, with no folding.
 */
export function Panel({
  title,
  children,
  className = '',
  as: Tag = 'div',
  defaultOpen,
  onToggle,
}: PanelProps) {
  const phone = usePhone()
  const collapsible = useContext(CollapsiblePanels) && Boolean(title) && phone
  const [open, setOpen] = useState(defaultOpen ?? false)
  const toggle = () => {
    setOpen(!open)
    onToggle?.(!open)
  }
  const bodyId = useId()

  return (
    <Tag
      className={`flex min-w-0 flex-col gap-2.5 rounded-[18px] bg-panel px-4 py-3.5 max-sm:gap-2 max-sm:rounded-[14px] max-sm:px-3 max-sm:py-2.5 ${className}`}
    >
      {title ? (
        <h2 className="text-[13px]/snug font-semibold opacity-70">
          {collapsible ? (
            <button
              type="button"
              aria-expanded={open}
              aria-controls={bodyId}
              onClick={toggle}
              className="-my-1 flex w-full items-center justify-between gap-2 py-1 text-left"
            >
              {title}
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className={`size-4 flex-none fill-none stroke-current stroke-2 transition-transform [stroke-linecap:round] [stroke-linejoin:round] motion-reduce:transition-none ${open ? 'rotate-180' : ''}`}
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
          ) : (
            title
          )}
        </h2>
      ) : null}
      {collapsible ? (
        <div id={bodyId} hidden={!open} className="flex flex-col gap-2.5 max-sm:gap-2">
          {children}
        </div>
      ) : (
        children
      )}
    </Tag>
  )
}

/** Small explanatory note inside a panel. */
export function Note({ children }: { readonly children: ReactNode }) {
  return <p className="text-[13px] opacity-70">{children}</p>
}
