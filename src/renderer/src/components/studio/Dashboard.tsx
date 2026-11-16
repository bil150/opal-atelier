import type { ReactNode } from 'react'
import { CollapsiblePanels } from '@renderer/components/ui/panel-collapse'
import { StudioLayout } from './studio-options'

interface DashboardProps {
  readonly layout: StudioLayout
  /** Main view (wheel, image, mannequin…) with its toolbar. */
  readonly stage: ReactNode
  /** Settings panels; hidden in focus layout. */
  readonly panels: ReactNode
  readonly stageLabel: string
}

const GRID: Readonly<Record<StudioLayout, string>> = {
  [StudioLayout.Above]: 'grid-cols-1',
  [StudioLayout.Below]: 'grid-cols-1',
  [StudioLayout.Right]: 'grid-cols-1 md:grid-cols-[minmax(0,1fr)_340px]',
  [StudioLayout.Focus]: 'grid-cols-1',
}

const PANELS: Readonly<Record<StudioLayout, string>> = {
  [StudioLayout.Above]:
    'order-first grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-2.5 max-sm:gap-2',
  [StudioLayout.Below]: 'grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-2.5 max-sm:gap-2',
  [StudioLayout.Right]:
    'grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-2.5 md:grid-cols-1 md:content-start',
  [StudioLayout.Focus]: 'hidden',
}

/**
 * Phones: the screen is shared in two areas that never overlap — the main view, always in sight, and the
 * panels (above or below it, as chosen), which take what they need, up to 55 % of the height, and scroll
 * beyond. The view takes the rest: large while the panels are folded, smaller as they unfold. Together they
 * fill the screen under the app bar and the tool's rail, so the view is watched while the settings are used.
 */
const PHONE_SPLIT =
  'max-sm:flex max-sm:h-[calc(100dvh-var(--app-header,64px)-4.75rem)] max-sm:flex-col max-sm:items-stretch'
const PHONE_PANELS =
  'max-sm:max-h-[55%] max-sm:flex-none max-sm:overflow-y-auto max-sm:overscroll-contain max-sm:content-start'

/** Main view and its settings panels (foldable): above it, below it, on its right, or hidden. */
export function Dashboard({ layout, stage, panels, stageLabel }: DashboardProps) {
  return (
    <div className={`grid items-start gap-x-4 gap-y-3 max-sm:gap-y-2 ${PHONE_SPLIT} ${GRID[layout]}`}>
      <section
        aria-label={stageLabel}
        className="flex min-w-0 flex-col gap-2.5 rounded-lg border border-line bg-paper-2 p-2.5 max-sm:min-h-0 max-sm:flex-1 max-sm:gap-1.5 max-sm:p-1.5"
      >
        {stage}
      </section>
      <div className={`min-w-0 ${PANELS[layout]} ${PHONE_PANELS}`}>
        <CollapsiblePanels.Provider value={true}>{panels}</CollapsiblePanels.Provider>
      </div>
    </div>
  )
}

/** The framed area of the main view. */
export function Stage({
  children,
  className = '',
}: {
  readonly children: ReactNode
  readonly className?: string
}) {
  return (
    <div
      className={`grid min-h-[280px] place-items-center overflow-hidden rounded-lg border border-line bg-paper max-sm:h-auto max-sm:min-h-0 max-sm:flex-1 sm:h-[min(62vh,640px)] ${className}`}
    >
      {children}
    </div>
  )
}

/** Toolbar under the main view: compact controls, centred. */
export function Toolbar({ label, children }: { readonly label: string; readonly children: ReactNode }) {
  return (
    <div role="toolbar" aria-label={label} className="flex flex-wrap items-center justify-center gap-2">
      {children}
    </div>
  )
}
