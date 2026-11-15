import { useTranslation } from 'react-i18next'
import { LOCALE_LABELS, SUPPORTED_LOCALES, toLocale } from '@renderer/i18n/locale'

/** EN | FR: the interface language, remembered on this device. */
export function LanguageSwitcher({ wide = false }: { readonly wide?: boolean }) {
  const { t, i18n } = useTranslation()
  const current = toLocale(i18n.resolvedLanguage)

  return (
    <div
      role="group"
      aria-label={t('language.label')}
      className={`flex overflow-hidden rounded-lg border border-line bg-paper-2 ${wide ? 'w-full' : ''}`}
    >
      {SUPPORTED_LOCALES.map((locale) => (
        <button
          key={locale}
          type="button"
          lang={locale}
          aria-pressed={locale === current}
          aria-label={LOCALE_LABELS[locale]}
          title={LOCALE_LABELS[locale]}
          onClick={() => void i18n.changeLanguage(locale)}
          className={`h-9 border-r border-line px-2.5 text-[13px] font-bold tracking-wide last:border-r-0 hover:bg-highlight aria-pressed:bg-ink aria-pressed:text-paper ${wide ? 'flex-1' : ''}`}
        >
          {wide ? LOCALE_LABELS[locale] : locale.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
