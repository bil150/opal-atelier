import { useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { STUDIO_LAYOUTS, StudioLayout } from './studio-options'

export interface StudioTab<T extends string> {
  readonly id: T
  readonly label: string
  readonly icon: ReactNode
}

interface StudioFrameProps<T extends string> {
  readonly tabs: readonly StudioTab<T>[]
  readonly activeTab: T
  readonly onSelectTab: (id: T) => void
  readonly layout: StudioLayout
  readonly onLayout: (layout: StudioLayout) => void
  /** The layout choice only matters for sections with a main view and panels (default true). */
  readonly showLayout?: boolean
  readonly children: ReactNode
}

const RAIL =
  'flex items-center gap-1.5 rounded-xl border border-line bg-paper-2 p-1.5 max-sm:flex-row sm:flex-col'
const TAB =
  'group relative grid size-11 place-items-center rounded-lg text-muted hover:bg-highlight hover:text-ink aria-selected:bg-ink aria-selected:text-paper max-sm:h-11 max-sm:w-auto max-sm:max-w-11 max-sm:flex-1'
const OPTION =
  'group relative grid size-9 place-items-center rounded-lg text-muted hover:bg-highlight hover:text-ink aria-pressed:bg-ink/15 aria-pressed:text-ink aria-pressed:shadow-[inset_0_0_0_1.5px_var(--color-ink)] max-sm:w-8'
const TOOLTIP =
  'pointer-events-none absolute top-1/2 left-[calc(100%+12px)] z-10 -translate-y-1/2 rounded-md bg-ink px-2 py-1 text-[13px] font-medium whitespace-nowrap text-paper opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 max-sm:hidden'
const ICON = 'fill-none stroke-current stroke-[1.8] [stroke-linecap:round] [stroke-linejoin:round]'

const LAYOUT_ICONS: Readonly<Record<StudioLayout, ReactNode>> = {
  [StudioLayout.Above]: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18" />
    </>
  ),
  [StudioLayout.Below]: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 15h18" />
    </>
  ),
  [StudioLayout.Right]: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M15 3v18" />
    </>
  ),
  [StudioLayout.Focus]: <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />,
}

/**
 * Frame of a studio tool: a sticky icon menu (sections, then layout), and the content.
 * On phones the menu becomes rows of icons above the content.
 */
export function StudioFrame<T extends string>({
  tabs,
  activeTab,
  onSelectTab,
  layout,
  onLayout,
  showLayout = true,
  children,
}: StudioFrameProps<T>) {
  const { t } = useTranslation()
  const tabRefs = useRef(new Map<T, HTMLButtonElement>())

  // While a studio tool is open, hover is a neutral grey (see index.css).
  useEffect(() => {
    const root = document.documentElement
    root.dataset.studio = ''
    return () => {
      delete root.dataset.studio
    }
  }, [])

  const handleTabKey = (event: KeyboardEvent, index: number) => {
    const last = tabs.length - 1
    const target = {
      ArrowDown: index + 1,
      ArrowRight: index + 1,
      ArrowUp: index - 1,
      ArrowLeft: index - 1,
      Home: 0,
      End: last,
    }[event.key]
    if (target === undefined) return
    event.preventDefault()
    const next = tabs[(target + tabs.length) % tabs.length]
    if (!next) return
    onSelectTab(next.id)
    tabRefs.current.get(next.id)?.focus()
  }

  return (
    <div className="grid items-start gap-4 sm:grid-cols-[56px_minmax(0,1fr)]">
      <div className="sticky top-[var(--app-header,0px)] z-30 flex flex-wrap gap-2 sm:top-[calc(var(--app-header,0px)+16px)] sm:flex-col">
        <div className={`${RAIL} max-sm:basis-full`}>
          <div
            role="tablist"
            aria-orientation="vertical"
            aria-label={t('studio.sections')}
            className="flex items-center gap-1.5 max-sm:w-full max-sm:justify-between max-sm:gap-0.5 sm:flex-col"
          >
            {tabs.map((tab, i) => (
              <button
                key={tab.id}
                ref={(el) => {
                  if (el) tabRefs.current.set(tab.id, el)
                  else tabRefs.current.delete(tab.id)
                }}
                type="button"
                role="tab"
                aria-selected={tab.id === activeTab}
                aria-label={tab.label}
                tabIndex={tab.id === activeTab ? 0 : -1}
                onClick={() => onSelectTab(tab.id)}
                onKeyDown={(e) => handleTabKey(e, i)}
                className={TAB}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" className={`size-[22px] ${ICON}`}>
                  {tab.icon}
                </svg>
                <span className={TOOLTIP}>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className={RAIL} hidden={!showLayout}>
          <div
            role="group"
            aria-label={t('studio.layout')}
            className="flex gap-1.5 max-sm:gap-0.5 sm:flex-col"
          >
            {STUDIO_LAYOUTS.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={option === layout}
                aria-label={t(`studio.layouts.${option}`)}
                onClick={() => onLayout(option)}
                className={`${OPTION} ${option === StudioLayout.Right ? 'max-md:hidden' : ''}`}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" className={`size-5 ${ICON}`}>
                  {LAYOUT_ICONS[option]}
                </svg>
                <span className={TOOLTIP}>{t(`studio.layouts.${option}`)}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="min-w-0" role="tabpanel" aria-label={tabs.find((tab) => tab.id === activeTab)?.label}>
        {children}
      </div>
    </div>
  )
}
