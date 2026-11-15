import type { ReactNode } from 'react'

export interface SegmentOption<T> {
  readonly value: T
  readonly label: ReactNode
  /** Accessible name when `label` is an icon. */
  readonly ariaLabel?: string
  readonly title?: string
}

interface SegmentedProps<T> {
  readonly label: string
  readonly options: readonly SegmentOption<T>[]
  readonly value: T
  readonly onChange: (value: T) => void
  readonly className?: string
  /** Buttons share the width equally. */
  readonly stretch?: boolean
}

/** Row of mutually exclusive buttons (aria-pressed). */
export function Segmented<T extends string | number>({
  label,
  options,
  value,
  onChange,
  className = '',
  stretch = false,
}: SegmentedProps<T>) {
  return (
    <div
      role="group"
      aria-label={label}
      className={`inline-flex max-w-full overflow-hidden rounded-md border border-line bg-paper-2 ${stretch ? 'flex w-full' : ''} ${className}`}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          aria-label={option.ariaLabel}
          title={option.title ?? option.ariaLabel}
          onClick={() => onChange(option.value)}
          className={`grid min-h-9 min-w-10 place-items-center border-r border-line px-2.5 text-sm font-semibold last:border-r-0 hover:bg-highlight aria-pressed:bg-ink aria-pressed:text-paper ${stretch ? 'flex-1' : ''}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

/** On/off button with an icon (aria-pressed). */
export function ToggleButton({
  pressed,
  onToggle,
  label,
  children,
  wide = false,
}: {
  readonly pressed: boolean
  readonly onToggle: () => void
  readonly label: string
  readonly children: ReactNode
  readonly wide?: boolean
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label={wide ? undefined : label}
      title={label}
      onClick={onToggle}
      className={`grid h-[38px] place-items-center rounded-md border border-line bg-paper-2 text-ink hover:bg-highlight aria-pressed:bg-ink aria-pressed:text-paper ${wide ? 'px-3 text-sm font-semibold' : 'w-10'}`}
    >
      {children}
    </button>
  )
}

/** "See as values" toggle icon: a half-filled circle. */
export function GreyIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 fill-none stroke-current stroke-[1.7]">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor" />
    </svg>
  )
}
