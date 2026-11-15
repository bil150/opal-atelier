export enum Locale {
  English = 'en',
  French = 'fr',
}

export const DEFAULT_LOCALE = Locale.English

export const SUPPORTED_LOCALES: readonly Locale[] = Object.values(Locale)

/** Native name of each language, shown as-is whatever the current locale. */
export const LOCALE_LABELS: Readonly<Record<Locale, string>> = {
  [Locale.English]: 'English',
  [Locale.French]: 'Français',
}

export function isLocale(value: string): value is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value)
}

/** Maps any BCP 47 tag ("fr-BE", "en_US"…) to a supported locale. */
export function toLocale(tag: string | undefined): Locale {
  const language = tag?.toLowerCase().split(/[-_]/)[0] ?? ''
  return isLocale(language) ? language : DEFAULT_LOCALE
}
