import type { ReactNode } from 'react'
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
  [StudioLayout.Above]: 'order-first grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-2.5',
  [StudioLayout.Below]: 'grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-2.5',
  [StudioLayout.Right]:
    'grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-2.5 md:grid-cols-1 md:content-start',
  [StudioLayout.Focus]: 'hidden',
}

/** Main view and its settings panels: above it, below it, on its right, or hidden. */
export function Dashboard({ layout, stage, panels, stageLabel }: DashboardProps) {
  return (
    <div className={`grid items-start gap-x-4 gap-y-3 ${GRID[layout]}`}>
      <section
        aria-label={stageLabel}
        className="flex min-w-0 flex-col gap-2.5 rounded-lg border border-line bg-paper-2 p-2.5"
      >
        {stage}
      </section>
      <div className={`min-w-0 ${PANELS[layout]}`}>{panels}</div>
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
      className={`grid min-h-[280px] place-items-center overflow-hidden rounded-lg border border-line bg-paper max-sm:aspect-square sm:h-[min(62vh,640px)] ${className}`}
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
