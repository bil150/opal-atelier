import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'
import fr from './locales/fr.json'
import { DEFAULT_LOCALE, Locale, SUPPORTED_LOCALES, toLocale } from './locale'

export const LOCALE_STORAGE_KEY = 'opal:locale'

export const resources = {
  [Locale.English]: { translation: en },
  [Locale.French]: { translation: fr },
} as const

function syncDocumentLanguage(tag: string): void {
  document.documentElement.lang = toLocale(tag)
}

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: DEFAULT_LOCALE,
    supportedLngs: SUPPORTED_LOCALES,
    nonExplicitSupportedLngs: true,
    load: 'languageOnly',
    interpolation: { escapeValue: false }, // React already escapes
    react: { transKeepBasicHtmlNodesFor: ['br', 'strong', 'b', 'i'] },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: LOCALE_STORAGE_KEY,
      caches: ['localStorage'],
    },
  })

syncDocumentLanguage(i18n.language)
i18n.on('languageChanged', syncDocumentLanguage)

export default i18n
