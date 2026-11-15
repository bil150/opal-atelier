import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { PageShell } from '@renderer/components/layout/PageShell'
import { PageWidth } from '@renderer/components/layout/page-width'
import { useLocalStorage } from '@renderer/hooks/use-local-storage'
import { toLocale } from '@renderer/i18n/locale'
import { AppRoute, glossaryTermPath } from '@renderer/routes'
import { GLOSSARY, type GlossaryEntry } from './glossary-entries'
import { buildCrossReferences, searchGlossary, type CrossReferenceIndex } from './glossary-search'
import { GLOSSARY_THEMES, isGlossaryTheme, type GlossaryTheme } from './glossary-theme'

const THEME_STORAGE_KEY = 'glossary:theme'
const isThemeOrAll = (value: unknown): value is GlossaryTheme | null =>
  value === null || isGlossaryTheme(value)

function termAnchorId(id: string): string {
  return `term-${id}`
}

function Definition({
  entry,
  links,
}: {
  readonly entry: GlossaryEntry
  readonly links: CrossReferenceIndex
}) {
  return (
    <>
      {links.link(entry).map((segment, i) =>
        segment.targetId ? (
          <Link
            key={i}
            to={glossaryTermPath(segment.targetId)}
            className="text-inherit underline decoration-dotted underline-offset-[3px] hover:decoration-solid"
          >
            {segment.text}
          </Link>
        ) : (
          <span key={i}>{segment.text}</span>
        ),
      )}
    </>
  )
}

export function GlossaryPage() {
  const { t, i18n } = useTranslation()
  const locale = toLocale(i18n.resolvedLanguage)
  const { termId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const searchId = useId()
  const listRef = useRef<HTMLDivElement>(null)

  const [query, setQuery] = useState('')
  const [theme, setTheme] = useLocalStorage<GlossaryTheme | null>(THEME_STORAGE_KEY, null, isThemeOrAll)

  const links = useMemo(() => buildCrossReferences(GLOSSARY, locale), [locale])
  const results = useMemo(() => searchGlossary(GLOSSARY, locale, query, theme), [locale, query, theme])
  const sections = GLOSSARY_THEMES.map((th) => ({
    theme: th,
    entries: results.filter((e) => e.theme === th),
  })).filter((s) => s.entries.length > 0)

  // Jumping to a term (cross-reference or direct link). location.key changes on every navigation,
  // even to the same term twice. First, during render, clear the filters that would hide it…
  const target = GLOSSARY.find((e) => e.id === termId)
  const [revealedFor, setRevealedFor] = useState<string | null>(null)
  if (target && revealedFor !== location.key) {
    setRevealedFor(location.key)
    if (!results.includes(target)) {
      setQuery('')
      setTheme(null)
    }
  }
  // …then, once it is on screen, bring it into view and flash it.
  const targetVisible = target !== undefined && results.includes(target)
  useEffect(() => {
    if (!target || !targetVisible) return
    const row = listRef.current?.querySelector<HTMLElement>(`#${termAnchorId(target.id)}`)
    if (!row) return
    const reduceMotion =
      typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
    row.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' })
    row.classList.remove('animate-flash')
    row.getBoundingClientRect() // reflow, so the animation restarts
    row.classList.add('animate-flash')
  }, [target, targetVisible, location.key])

  const handleSearchKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') setQuery('')
  }

  const chooseTheme = (next: GlossaryTheme | null) => {
    setTheme(next)
    if (termId) void navigate(AppRoute.Glossary, { replace: true })
  }

  const chip = (selected: boolean) =>
    `min-h-[34px] rounded-full border px-3 text-[13px] font-semibold ${
      selected ? 'border-ink bg-ink text-paper' : 'border-line bg-paper-2 text-ink hover:bg-highlight'
    }`

  return (
    <PageShell
      title={t('glossary.title')}
      breadcrumbs={[{ label: t('app.name'), to: AppRoute.Home }, { label: t('glossary.title') }]}
      width={PageWidth.Wide}
    >
      <h1 className="text-[clamp(28px,7vw,36px)]/[1.15] font-semibold text-balance">{t('glossary.title')}</h1>

      {/* Search and themes stay on top while scrolling */}
      <div className="sticky top-[var(--app-header,0px)] z-10 flex flex-col gap-2.5 bg-paper py-3">
        <div className="flex min-h-12 items-center gap-2.5 rounded-xl border border-line bg-paper-2 px-3.5 focus-within:border-ink">
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="size-5 flex-none fill-none stroke-current stroke-2 opacity-55"
          >
            <circle cx="11" cy="11" r="6.5" />
            <path d="M16 16l4.5 4.5" />
          </svg>
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleSearchKey}
            placeholder={t('glossary.searchPlaceholder')}
            aria-label={t('glossary.searchLabel')}
            autoComplete="off"
            spellCheck={false}
            className="min-h-11 min-w-0 flex-1 border-0 bg-transparent p-0 text-base outline-none"
          />
        </div>
        <div role="group" aria-label={t('glossary.themesLabel')} className="flex flex-wrap gap-1.5">
          <button
            type="button"
            aria-pressed={theme === null}
            onClick={() => chooseTheme(null)}
            className={chip(theme === null)}
          >
            {t('glossary.allThemes')}
          </button>
          {GLOSSARY_THEMES.map((th) => (
            <button
              key={th}
              type="button"
              aria-pressed={theme === th}
              onClick={() => chooseTheme(th)}
              className={chip(theme === th)}
            >
              {t(`glossary.themes.${th}`)}
            </button>
          ))}
        </div>
        <p aria-live="polite" className="text-[13px] text-muted">
          {t('glossary.count', { count: results.length })}
        </p>
      </div>

      <div ref={listRef} className="flex flex-col gap-[22px]">
        {sections.map((section) => (
          <section key={section.theme} aria-labelledby={`theme-${section.theme}`}>
            <h2 id={`theme-${section.theme}`} className="mb-2 text-lg font-semibold">
              {t(`glossary.themes.${section.theme}`)}
            </h2>
            <dl className="flex flex-col border-t border-line">
              {section.entries.map((entry) => {
                const { term } = entry.text[locale]
                return (
                  <div
                    key={entry.id}
                    id={termAnchorId(entry.id)}
                    className="grid scroll-mt-[calc(var(--app-header,0px)+7rem)] grid-cols-1 gap-x-[18px] gap-y-1 rounded-md border-b border-line px-1.5 py-2.5 sm:grid-cols-[minmax(150px,220px)_minmax(0,1fr)]"
                  >
                    <dt className="font-bold">{term}</dt>
                    <dd className="leading-normal">
                      <Definition entry={entry} links={links} />
                      {entry.tool ? (
                        <>
                          {' '}
                          <Link to={entry.tool} className="text-[13px] font-semibold whitespace-nowrap">
                            {t('glossary.seeInTool')}
                          </Link>
                        </>
                      ) : null}
                    </dd>
                  </div>
                )
              })}
            </dl>
          </section>
        ))}
        {results.length === 0 ? <p className="opacity-70">{t('glossary.empty')}</p> : null}
      </div>
    </PageShell>
  )
}
