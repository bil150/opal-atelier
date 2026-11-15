import { useEffect, useRef, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { OfflineNotice } from '@renderer/components/ui/OfflineNotice'
import { AppBar } from './AppBar'
import type { Crumb } from './Breadcrumbs'
import { PageWidth } from './page-width'

const WIDTH_CLASS: Readonly<Record<PageWidth, string>> = {
  [PageWidth.Narrow]: 'max-w-[680px]',
  [PageWidth.Medium]: 'max-w-[820px]',
  [PageWidth.Wide]: 'max-w-[980px]',
  [PageWidth.Full]: 'max-w-[1500px]',
}

interface PageShellProps {
  /** Shown in the browser tab, followed by the app name. */
  readonly title: string | null
  readonly breadcrumbs: readonly Crumb[]
  readonly width?: PageWidth
  readonly children: ReactNode
}

/** Common frame of every screen: the app bar (same everywhere, full width, sticky), the content, the footer. */
export function PageShell({ title, breadcrumbs, width = PageWidth.Narrow, children }: PageShellProps) {
  const { t } = useTranslation()
  const appName = t('app.name')

  const headerRef = useRef<HTMLElement>(null)

  // Sticky parts of the pages (tool rail, glossary search) sit under the bar: they read its height.
  useEffect(() => {
    const header = headerRef.current
    if (!header) return
    const publish = () =>
      document.documentElement.style.setProperty('--app-header', `${header.offsetHeight}px`)
    publish()
    if (typeof ResizeObserver !== 'function') return
    const observer = new ResizeObserver(publish)
    observer.observe(header)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    document.title = title ? `${title} · ${appName}` : appName
  }, [title, appName])

  return (
    <>
      <AppBar breadcrumbs={breadcrumbs} headerRef={headerRef} />
      <div
        className={`mx-auto flex flex-col gap-6 px-[max(16px,env(safe-area-inset-left))] pt-5 pb-14 ${WIDTH_CLASS[width]}`}
      >
        <main className="flex flex-col gap-6">
          <OfflineNotice />
          {children}
        </main>
        <footer className="text-[13px] text-muted">
          <p>{t('footer.privacy')}</p>
          <p>
            {t('footer.license')} · v{__APP_VERSION__}
          </p>
        </footer>
      </div>
    </>
  )
}
