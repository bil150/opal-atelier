import type { ReactNode } from 'react'

export interface ModeOption<T> {
  readonly value: T
  readonly title: string
  readonly subtitle: string
  readonly icon: ReactNode
}

interface ModeTabsProps<T> {
  readonly label: string
  readonly options: readonly ModeOption<T>[]
  readonly value: T
  readonly onChange: (value: T) => void
}

/** Two or three large options side by side; a dark background slides under the chosen one. */
export function ModeTabs<T extends string>({ label, options, value, onChange }: ModeTabsProps<T>) {
  const index = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  )
  const count = options.length

  return (
    <div
      role="group"
      aria-label={label}
      className="relative grid gap-1 rounded-[14px] border border-line bg-paper p-1"
      style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}
    >
      <span
        aria-hidden="true"
        className="absolute top-1 bottom-1 left-1 rounded-[10px] bg-ink transition-transform duration-[250ms] ease-[cubic-bezier(.3,.7,.2,1)]"
        style={{
          width: `calc((100% - ${(count + 1) * 4}px) / ${count})`,
          transform: `translateX(calc(${index * 100}% + ${index * 4}px))`,
        }}
      />
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
          className="relative z-[1] flex min-h-[52px] items-center gap-2.5 rounded-[10px] px-3.5 py-1.5 text-left text-ink transition-colors not-aria-pressed:hover:bg-highlight aria-pressed:text-paper max-[480px]:min-h-11"
        >
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="size-6 flex-none fill-none stroke-current stroke-[1.7] [stroke-linejoin:round]"
          >
            {option.icon}
          </svg>
          <span className="flex min-w-0 flex-col leading-tight">
            <b className="text-[15px] font-bold">{option.title}</b>
            <small className="truncate text-xs opacity-70 max-[480px]:hidden">{option.subtitle}</small>
          </span>
        </button>
      ))}
    </div>
  )
}
