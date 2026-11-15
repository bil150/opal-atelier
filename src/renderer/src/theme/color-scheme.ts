/**
 * Day / night. Day by default; "device" follows the system setting. The choice is remembered on this
 * device and shared by every control (top bar button, settings page).
 */
import { useSyncExternalStore } from 'react'
import { isOneOf, readStored, writeStored } from '@renderer/hooks/use-local-storage'

export enum ColorScheme {
  Light = 'light',
  Dark = 'dark',
  /** Follow the device. */
  System = 'system',
}

export const COLOR_SCHEMES: readonly ColorScheme[] = Object.values(ColorScheme)
export const DEFAULT_COLOR_SCHEME = ColorScheme.Light
export const COLOR_SCHEME_KEY = 'color-scheme'

const listeners = new Set<() => void>()
let current: ColorScheme | null = null

export function readColorScheme(): ColorScheme {
  current ??= readStored(COLOR_SCHEME_KEY, DEFAULT_COLOR_SCHEME, isOneOf(COLOR_SCHEMES))
  return current
}

export function deviceColorScheme(): ColorScheme.Light | ColorScheme.Dark {
  const prefersDark = typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches
  return prefersDark ? ColorScheme.Dark : ColorScheme.Light
}

/** What is actually shown: day or night. */
export function shownColorScheme(choice: ColorScheme): ColorScheme.Light | ColorScheme.Dark {
  return choice === ColorScheme.System ? deviceColorScheme() : choice
}

/** Forces the scheme on <html> (CSS reads data-theme), or lets the device decide. */
export function applyColorScheme(choice: ColorScheme): void {
  if (choice === ColorScheme.System) delete document.documentElement.dataset.theme
  else document.documentElement.dataset.theme = choice
}

export function setColorScheme(choice: ColorScheme): void {
  current = choice
  writeStored(COLOR_SCHEME_KEY, choice)
  applyColorScheme(choice)
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  const media = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null
  media?.addEventListener('change', listener) // "device" follows a change of the system setting
  return () => {
    listeners.delete(listener)
    media?.removeEventListener('change', listener)
  }
}

export function useColorScheme(): ColorScheme {
  return useSyncExternalStore(subscribe, readColorScheme)
}

/** For tests: forget the cached choice. */
export function resetColorSchemeForTests(): void {
  current = null
  delete document.documentElement.dataset.theme
}
