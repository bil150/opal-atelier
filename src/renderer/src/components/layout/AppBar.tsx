import { useEffect, useId, useState, type Ref } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink, useLocation } from 'react-router'
import { BackdropPicker } from '@renderer/components/ui/BackdropPicker'
import { LanguageSwitcher } from '@renderer/components/ui/LanguageSwitcher'
import { ThemeMenu } from '@renderer/components/ui/ThemeMenu'
import { ThemeToggle } from '@renderer/components/ui/ThemeToggle'
import { AppRoute } from '@renderer/routes'
import { Breadcrumbs, type Crumb } from './Breadcrumbs'

const NAV_ITEMS = [
  { to: AppRoute.ImageStudy, label: 'home.sections.imageStudy' },
  { to: AppRoute.Color, label: 'home.sections.color' },
  { to: AppRoute.Mannequin, label: 'home.sections.mannequin' },
  { to: AppRoute.Glossary, label: 'glossary.title' },
] as const

const ICON = 'size-[18px] fill-none stroke-current stroke-2 [stroke-linecap:round] [stroke-linejoin:round]'
const SQUARE =
  'inline-grid size-9 flex-none place-items-center rounded-lg border border-line bg-paper-2 text-ink hover:border-ink'

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={ICON}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  )
}

interface AppBarProps {
  readonly breadcrumbs: readonly Crumb[]
  readonly headerRef: Ref<HTMLElement>
}

/**
 * The bar at the top of every screen. Wide screens: logo and trail, the tools, then the settings group
 * (theme, day/night, language, settings). Narrow screens: logo and trail, and a menu button that opens
 * the same things in a panel.
 */
export function AppBar({ breadcrumbs, headerRef }: AppBarProps) {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const panelId = useId()

  // Moving to another page closes the menu.
  const [shownPath, setShownPath] = useState(pathname)
  if (shownPath !== pathname) {
    setShownPath(pathname)
    setOpen(false)
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  const navLink = (wide: boolean) =>
    `rounded-lg no-underline hover:bg-highlight aria-[current=page]:bg-ink aria-[current=page]:text-paper ${
      wide
        ? 'px-3 py-2.5 text-base font-semibold text-ink'
        : 'px-3 py-2 text-sm font-semibold text-muted hover:text-ink'
    }`

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur supports-backdrop-filter:bg-paper/75"
    >
      <div className="flex min-h-16 items-center gap-3 px-[max(16px,env(safe-area-inset-left))] py-2 sm:px-6">
        <Breadcrumbs items={breadcrumbs} />

        <nav aria-label={t('nav.main')} className="max-lg:hidden">
          <ul className="m-0 flex list-none gap-1 p-0">
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <NavLink to={item.to} className={navLink(false)}>
                  {t(item.label)}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2 max-lg:hidden">
          <ThemeMenu />
          <ThemeToggle />
          <LanguageSwitcher />
          <NavLink
            to={AppRoute.Settings}
            aria-label={t('nav.settings')}
            title={t('nav.settings')}
            className={`${SQUARE} aria-[current=page]:border-ink aria-[current=page]:bg-ink aria-[current=page]:text-paper`}
          >
            <GearIcon />
          </NavLink>
        </div>

        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={open ? t('nav.close') : t('nav.menu')}
          onClick={() => setOpen(!open)}
          className={`${SQUARE} lg:hidden`}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className={ICON}>
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>

      {open ? (
        <>
          <button
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            onClick={() => setOpen(false)}
            className="fixed inset-0 top-[var(--app-header,64px)] -z-10 cursor-default bg-black/30 lg:hidden"
          />
          <div
            id={panelId}
            className="absolute inset-x-0 top-full max-h-[calc(100dvh-var(--app-header,64px))] overflow-y-auto border-b border-line bg-paper px-[max(16px,env(safe-area-inset-left))] pt-3 pb-5 shadow-[0_16px_32px_-16px_rgb(0_0_0/.4)] lg:hidden"
          >
            <nav aria-label={t('nav.main')}>
              <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
                <li>
                  <NavLink to={AppRoute.Home} end className={`block ${navLink(true)}`}>
                    {t('nav.home')}
                  </NavLink>
                </li>
                {NAV_ITEMS.map((item) => (
                  <li key={item.to}>
                    <NavLink to={item.to} className={`block ${navLink(true)}`}>
                      {t(item.label)}
                    </NavLink>
                  </li>
                ))}
                <li>
                  <NavLink to={AppRoute.Settings} className={`flex items-center gap-2 ${navLink(true)}`}>
                    <GearIcon />
                    {t('nav.settings')}
                  </NavLink>
                </li>
              </ul>
            </nav>
            <div className="mt-4 flex flex-col gap-3 border-t border-line pt-4">
              <BackdropPicker />
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <LanguageSwitcher wide />
              </div>
            </div>
          </div>
        </>
      ) : null}
    </header>
  )
}
