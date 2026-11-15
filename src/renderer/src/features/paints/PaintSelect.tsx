import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from 'react'
import { useTranslation } from 'react-i18next'
import { PAINT_FAMILIES } from './generic-paints'
import { PaintSource, matchesPaint, type PaintOption } from './paint-options'

interface PaintSelectProps {
  /** Accessible name of the trigger, e.g. "Colour 1: Ultramarine blue. Change". */
  readonly label: string
  readonly value: PaintOption | null
  readonly options: readonly PaintOption[]
  readonly source: PaintSource
  readonly onChange: (id: string) => void
  /** Swatch shown on the trigger (e.g. greyed when viewing values). */
  readonly swatch?: string | undefined
  readonly emptyText: string
}

interface Group {
  readonly label: string
  readonly items: readonly PaintOption[]
}

const SHEET_QUERY = '(max-width: 640px)'

/** Under the trigger (or above when there is no room); a bottom sheet on phones (no inline position). */
function panelPosition(anchor: HTMLElement): CSSProperties {
  if (typeof matchMedia === 'function' && matchMedia(SHEET_QUERY).matches) return {}
  const r = anchor.getBoundingClientRect()
  const width = Math.max(r.width, 300)
  const below = innerHeight - r.bottom - 12
  const up = below < 260 && r.top > below
  return {
    left: Math.max(12, Math.min(r.left, innerWidth - width - 12)),
    width,
    maxHeight: Math.min(420, innerHeight - 32, (up ? r.top : below) - 8),
    top: up ? 'auto' : r.bottom + 6,
    bottom: up ? innerHeight - r.top + 6 : 'auto',
  }
}

/** A chosen paint (swatch, name, pigment) that opens a searchable list of paints. */
export function PaintSelect({
  label,
  value,
  options,
  source,
  onChange,
  swatch,
  emptyText,
}: PaintSelectProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [trigger, setTrigger] = useState<HTMLButtonElement | null>(null)

  const close = useCallback(
    (refocus: boolean) => {
      setOpen(false)
      if (refocus) trigger?.focus()
    },
    [trigger],
  )

  return (
    <>
      <button
        ref={setTrigger}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((o) => !o)}
        className="group flex min-h-[46px] w-full min-w-0 items-center gap-2.5 rounded-[10px] border border-line bg-paper-2 py-1 pr-2.5 pl-1 text-left text-ink transition-colors hover:border-ink aria-expanded:border-ink"
      >
        {value ? (
          <>
            <span
              className="size-9 flex-none rounded-[7px] border border-line"
              style={{ background: swatch ?? value.hex }}
            />
            <span className="flex min-w-0 flex-col leading-tight">
              <b className="truncate text-sm font-semibold">{value.name}</b>
              <small className="truncate text-xs opacity-65">{value.detail}</small>
            </span>
          </>
        ) : (
          <span className="px-2 text-sm">{emptyText}</span>
        )}
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="ml-auto size-[18px] flex-none fill-none stroke-current stroke-2 opacity-60 transition-transform group-aria-expanded:rotate-180"
        >
          <path d="M7 10l5 5 5-5" />
        </svg>
      </button>
      {open && trigger ? (
        <PickerPanel
          trigger={trigger}
          options={options}
          source={source}
          selectedId={value?.id ?? null}
          onChoose={(id) => {
            onChange(id)
            close(true)
          }}
          onClose={close}
          title={t('paints.picker.label')}
        />
      ) : null}
    </>
  )
}

function PickerPanel({
  trigger,
  options,
  source,
  selectedId,
  onChoose,
  onClose,
  title,
}: {
  readonly trigger: HTMLButtonElement
  readonly options: readonly PaintOption[]
  readonly source: PaintSource
  readonly selectedId: string | null
  readonly onChoose: (id: string) => void
  readonly onClose: (refocus: boolean) => void
  readonly title: string
}) {
  const { t } = useTranslation()
  const listId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [position, setPosition] = useState(() => panelPosition(trigger))

  const groups: Group[] = useMemo(() => {
    const familyLabel = (o: PaintOption) => (o.family ? t(`paints.families.${o.family}`) : '')
    const found = options.filter((o) => matchesPaint(o, query, familyLabel(o)))
    if (source === PaintSource.Inventory) {
      return [
        { label: t('paints.picker.owned'), items: found.filter((o) => o.owned) },
        { label: t('paints.picker.others'), items: found.filter((o) => !o.owned) },
      ].filter((g) => g.items.length)
    }
    return PAINT_FAMILIES.map((f) => ({
      label: t(`paints.families.${f}`),
      items: found.filter((o) => o.family === f),
    })).filter((g) => g.items.length)
  }, [options, query, source, t])
  const flat = groups.flatMap((g) => g.items)

  const initialActive = Math.max(
    0,
    flat.findIndex((o) => o.id === selectedId),
  )
  const [active, setActive] = useState(initialActive)
  const activeIndex = query ? Math.min(active, Math.max(0, flat.length - 1)) : active
  const optionId = (i: number) => `${listId}-${i}`

  // Under the trigger (or above when there is no room); a bottom sheet on phones.
  const place = useCallback(() => setPosition(panelPosition(trigger)), [trigger])
  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true })
    const outside = (e: PointerEvent) => {
      const target = e.target as Node
      if (!panelRef.current?.contains(target) && !trigger.contains(target)) onClose(false)
    }
    document.addEventListener('pointerdown', outside)
    addEventListener('resize', place)
    document.addEventListener('scroll', place, true)
    return () => {
      document.removeEventListener('pointerdown', outside)
      removeEventListener('resize', place)
      document.removeEventListener('scroll', place, true)
    }
  }, [onClose, place, trigger])

  useEffect(() => {
    document.getElementById(optionId(activeIndex))?.scrollIntoView({ block: 'nearest' })
  })

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const step = e.key === 'ArrowDown' ? 1 : -1
      setActive(Math.max(0, Math.min(flat.length - 1, activeIndex + step)))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const option = flat[activeIndex]
      if (option) onChoose(option.id)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      if (query) setQuery('')
      else onClose(true)
    } else if (e.key === 'Tab') {
      onClose(false)
    }
  }

  let index = -1
  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label={title}
      style={position}
      className="fixed z-[60] flex flex-col overflow-hidden rounded-[14px] border border-line bg-paper-2 text-ink shadow-[0_12px_32px_rgb(0_0_0/.22)] max-sm:inset-x-0 max-sm:bottom-0 max-sm:max-h-[72dvh] max-sm:rounded-b-none"
    >
      <div className="flex items-center gap-2 border-b border-line px-3 py-2.5">
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="size-[18px] flex-none fill-none stroke-current stroke-2 opacity-55"
        >
          <circle cx="11" cy="11" r="6.5" />
          <path d="M16 16l4.5 4.5" />
        </svg>
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setActive(0)
          }}
          onKeyDown={handleKey}
          placeholder={t('paints.picker.search')}
          aria-label={t('paints.picker.search')}
          aria-controls={listId}
          aria-activedescendant={flat.length ? optionId(activeIndex) : undefined}
          autoComplete="off"
          spellCheck={false}
          className="min-h-9 min-w-0 flex-auto border-0 bg-transparent p-0 text-[15px] outline-none"
        />
      </div>
      <ul
        id={listId}
        role="listbox"
        aria-label={t('paints.picker.list')}
        className="overflow-y-auto overscroll-contain p-1.5"
      >
        {groups.map((group) => (
          <li key={group.label} role="presentation">
            <div
              role="presentation"
              className="px-2 pt-2.5 pb-1 text-[11px] font-bold tracking-[.06em] uppercase opacity-55"
            >
              {group.label}
            </div>
            <ul role="presentation">
              {group.items.map((option) => {
                index++
                const i = index
                const selected = option.id === selectedId
                return (
                  <li
                    key={option.id}
                    id={optionId(i)}
                    role="option"
                    aria-selected={selected}
                    onPointerMove={() => {
                      if (i !== activeIndex) setActive(i)
                    }}
                    onClick={() => onChoose(option.id)}
                    className={`flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1 ${i === activeIndex ? 'bg-highlight' : ''}`}
                  >
                    <span
                      className="size-[30px] flex-none rounded-md border border-line"
                      style={{ background: option.hex }}
                    />
                    <span className="flex min-w-0 flex-col leading-tight">
                      <b className="truncate text-sm font-semibold">
                        {option.name}
                        {selected ? <span className="opacity-70"> ✓</span> : null}
                      </b>
                      <small className="truncate text-xs opacity-60">{option.detail}</small>
                    </span>
                  </li>
                )
              })}
            </ul>
          </li>
        ))}
        {flat.length === 0 ? (
          <li role="presentation" className="px-2 py-3.5 text-sm opacity-65">
            {source === PaintSource.Inventory && options.length === 0
              ? t('paints.picker.emptyInventory')
              : t('paints.picker.none')}
          </li>
        ) : null}
      </ul>
    </div>
  )
}
