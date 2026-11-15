import { useState, type ReactNode } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { PageShell } from '@renderer/components/layout/PageShell'
import { PageWidth } from '@renderer/components/layout/page-width'
import { InstallButton } from '@renderer/components/ui/InstallButton'
import { Segmented } from '@renderer/components/ui/Segmented'
import { BUTTON, BUTTON_DANGER } from '@renderer/components/ui/buttons'
import { formatBytes } from '@renderer/features/image-study/settings/backup'
import { useEnvironment } from '@renderer/hooks/use-environment'
import { LOCALE_LABELS, SUPPORTED_LOCALES, toLocale } from '@renderer/i18n/locale'
import { Runtime } from '@renderer/platform'
import { Link } from 'react-router'
import { AppRoute, ToolPath } from '@renderer/routes'
import { BACKDROPS, BACKDROP_SWATCH, setBackdrop, useBackdrop } from '@renderer/theme/backdrop'
import { COLOR_SCHEMES, setColorScheme, useColorScheme } from '@renderer/theme/color-scheme'
import { appStorageBytes, wipeAppData } from './app-data'

const AUTHOR_URL = 'https://github.com/bil150'
const SOURCE_URL = 'https://github.com/bil150/opal-atelier'
/** Installers for Windows, macOS and Linux are attached to each release (see .github/workflows/release.yml). */
const RELEASES_URL = 'https://github.com/bil150/opal-atelier/releases/latest'
const SITE_URL = 'https://bil150.github.io/opal-atelier/'

function Section({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  const id = `settings-${title}`
  return (
    <section
      aria-labelledby={id}
      className="flex flex-col gap-3 rounded-[20px] border border-line bg-paper-2 p-5"
    >
      <h2 id={id} className="text-lg/snug font-bold">
        {title}
      </h2>
      {children}
    </section>
  )
}

const NOTE = 'text-[13px] text-muted'
const EXTERNAL = { target: '_blank', rel: 'noreferrer' } as const

/** App-wide settings (appearance, language, installation, data) and About. */
export function SettingsPage() {
  const { t, i18n } = useTranslation()
  const locale = toLocale(i18n.resolvedLanguage)
  const backdrop = useBackdrop()
  const scheme = useColorScheme()
  const { runtime, isTouch } = useEnvironment()
  const [message, setMessage] = useState('')
  const [, refresh] = useState(0)

  const bytes = appStorageBytes()
  const size = bytes === null ? null : formatBytes(bytes, locale)
  const built = new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(new Date(__BUILD_DATE__))

  const wipe = () => {
    if (!window.confirm(t('settings.data.wipeConfirm'))) return
    wipeAppData()
    setMessage(t('settings.data.wiped'))
    refresh((n) => n + 1)
  }

  return (
    <PageShell
      title={t('settings.title')}
      breadcrumbs={[{ label: t('app.name'), to: AppRoute.Home }, { label: t('settings.title') }]}
      width={PageWidth.Medium}
    >
      <h1 className="text-3xl/tight font-bold">{t('settings.title')}</h1>
      {message ? (
        <p role="status" className="rounded-md border border-line px-3 py-2.5 text-sm">
          {message}
        </p>
      ) : null}

      <Section title={t('settings.appearance.title')}>
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">{t('settings.appearance.theme')}</span>
          <Segmented
            label={t('settings.appearance.theme')}
            value={backdrop}
            onChange={setBackdrop}
            stretch
            options={BACKDROPS.map((option) => {
              const [paper, ink] = BACKDROP_SWATCH[option]
              return {
                value: option,
                label: (
                  <span className="flex items-center gap-2 py-1">
                    <svg viewBox="0 0 20 20" aria-hidden="true" className="size-[18px] flex-none">
                      <circle cx="10" cy="10" r="8.5" fill={paper} stroke="currentColor" strokeWidth="1" />
                      <path d="M10 1.5a8.5 8.5 0 0 1 0 17z" fill={ink} />
                    </svg>
                    {t(`studio.backdrops.${option}`)}
                  </span>
                ),
              }
            })}
          />
          <p className={NOTE}>{t('settings.appearance.themeNote')}</p>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">{t('settings.appearance.scheme')}</span>
          <Segmented
            label={t('settings.appearance.scheme')}
            value={scheme}
            onChange={setColorScheme}
            stretch
            options={COLOR_SCHEMES.map((option) => ({
              value: option,
              label: t(`settings.appearance.schemes.${option}`),
            }))}
          />
          <p className={NOTE}>{t('settings.appearance.schemeNote')}</p>
        </div>
      </Section>

      <Section title={t('settings.language.title')}>
        <Segmented
          label={t('settings.language.title')}
          value={locale}
          onChange={(next) => void i18n.changeLanguage(next)}
          stretch
          options={SUPPORTED_LOCALES.map((option) => ({ value: option, label: LOCALE_LABELS[option] }))}
        />
      </Section>

      <Section title={t('settings.tools.title')}>
        <Link
          to={ToolPath.ImageStudySettings}
          className="group flex items-center gap-3 rounded-xl border border-line p-3.5 text-ink no-underline hover:border-ink"
        >
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">{t('settings.tools.imageStudy')}</span>
            <span className={`block ${NOTE}`}>{t('settings.tools.imageStudyNote')}</span>
          </span>
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="size-5 flex-none fill-none stroke-current stroke-2 opacity-60 transition-transform [stroke-linecap:round] [stroke-linejoin:round] group-hover:translate-x-0.5"
          >
            <path d="M9 6l6 6-6 6" />
          </svg>
        </Link>
      </Section>

      <Section title={t('settings.app.title')}>
        <p className="text-sm">
          {runtime === Runtime.Desktop
            ? t('settings.app.desktop')
            : runtime === Runtime.InstalledApp
              ? t('settings.app.installed')
              : t('settings.app.web')}
        </p>
        {runtime === Runtime.Browser ? (
          <div className="flex flex-col divide-y divide-line rounded-xl border border-line">
            {/* Computers: the desktop app (Electron), whose installers are attached to the releases. */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 p-3.5">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{t('settings.app.computer')}</p>
                <p className={NOTE}>{t('settings.app.computerText')}</p>
              </div>
              <a href={RELEASES_URL} {...EXTERNAL} className={`${BUTTON} no-underline`}>
                {t('settings.app.download')}
              </a>
            </div>
            {/* Phones and tablets: the web app is what gets installed (there is no installer). */}
            <div className="flex flex-col gap-2 p-3.5">
              <p className="text-sm font-semibold">{t('settings.app.phone')}</p>
              <p className="text-sm">
                <Trans
                  i18nKey="settings.app.phoneText"
                  components={{ site: <a href={SITE_URL} {...EXTERNAL} className="font-semibold" /> }}
                />
              </p>
              {isTouch ? (
                <div className="self-start">
                  <InstallButton />
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </Section>

      <Section title={t('settings.data.title')}>
        <p className="text-sm">
          {size
            ? t('settings.data.used', { size: t(`imageStudy.settings.${size.unit}`, { value: size.value }) })
            : t('settings.data.unavailable')}
        </p>
        <button type="button" onClick={wipe} className={`${BUTTON_DANGER} self-start`}>
          {t('settings.data.wipe')}
        </button>
      </Section>

      <Section title={t('settings.about.title')}>
        <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
          <dt className="text-muted">{t('app.name')}</dt>
          <dd className="m-0">
            {t('settings.about.version', { version: __APP_VERSION__ })} ·{' '}
            {t('settings.about.built', { date: built })}
          </dd>
          <dt className="text-muted">{t('settings.about.madeBy')}</dt>
          <dd className="m-0">
            <a href={AUTHOR_URL} {...EXTERNAL} className="font-semibold">
              @bil150
            </a>
          </dd>
          <dt className="text-muted">{t('settings.about.source')}</dt>
          <dd className="m-0">
            <a href={SOURCE_URL} {...EXTERNAL}>
              github.com/bil150/opal-atelier
            </a>
          </dd>
        </dl>

        <h3 className="mt-2 text-sm font-semibold">{t('settings.about.licenses')}</h3>
        <ul className="m-0 flex list-disc flex-col gap-1 pl-5 text-sm">
          <li>{t('settings.about.codeLicense')}</li>
          <li>{t('settings.about.contentLicense')}</li>
        </ul>

        <h3 className="mt-2 text-sm font-semibold">{t('settings.about.openSource')}</h3>
        <p className={NOTE}>{t('settings.about.openSourceNote')}</p>
        <ul className="m-0 grid list-none grid-cols-1 gap-1.5 p-0 text-sm sm:grid-cols-2">
          {__OPEN_SOURCE__.map((library) => (
            <li
              key={library.name}
              className="flex items-baseline justify-between gap-3 rounded-md border border-line px-3 py-2"
            >
              <a href={library.url} {...EXTERNAL} className="font-medium">
                {library.name}
              </a>
              <span className="text-[12px] text-muted tabular-nums">
                {library.version} · {library.license}
              </span>
            </li>
          ))}
        </ul>
        <p className={NOTE}>{t('settings.about.fonts')}</p>
      </Section>
    </PageShell>
  )
}
