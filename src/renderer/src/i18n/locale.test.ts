import { describe, expect, it } from 'vitest'
import { DEFAULT_LOCALE, Locale, isLocale, toLocale } from './locale'

describe('isLocale', () => {
  it('accepts supported locales only', () => {
    expect(isLocale('en')).toBe(true)
    expect(isLocale('fr')).toBe(true)
    expect(isLocale('de')).toBe(false)
    expect(isLocale('')).toBe(false)
  })
})

describe('toLocale', () => {
  it.each([
    ['fr', Locale.French],
    ['fr-BE', Locale.French],
    ['FR_ca', Locale.French],
    ['en-GB', Locale.English],
  ])('maps %s to %s', (tag, expected) => {
    expect(toLocale(tag)).toBe(expected)
  })

  it('falls back to the default locale', () => {
    expect(toLocale('nl-NL')).toBe(DEFAULT_LOCALE)
    expect(toLocale(undefined)).toBe(DEFAULT_LOCALE)
  })
})
