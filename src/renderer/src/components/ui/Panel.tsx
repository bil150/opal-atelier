import type { ReactNode } from 'react'

interface PanelProps {
  readonly title?: ReactNode
  readonly children: ReactNode
  readonly className?: string
  readonly as?: 'div' | 'article'
}

/** Rounded "bento" tile holding a group of settings or information. */
export function Panel({ title, children, className = '', as: Tag = 'div' }: PanelProps) {
  return (
    <Tag className={`flex min-w-0 flex-col gap-2.5 rounded-[18px] bg-panel px-4 py-3.5 ${className}`}>
      {title ? <h2 className="text-[13px]/snug font-semibold opacity-70">{title}</h2> : null}
      {children}
    </Tag>
  )
}

/** Small explanatory note inside a panel. */
export function Note({ children }: { readonly children: ReactNode }) {
  return <p className="text-[13px] opacity-70">{children}</p>
}
