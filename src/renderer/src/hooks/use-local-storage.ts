import { useEffect, useState } from 'react'

/** Every key the app stores is namespaced, so it never clashes with other pages of the same origin. */
export const STORAGE_PREFIX = 'opal:'

export function readStored<T>(key: string, fallback: T, isValid: (value: unknown) => value is T): T {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key)
    if (raw === null) return fallback
    const value: unknown = JSON.parse(raw)
    return isValid(value) ? value : fallback
  } catch {
    return fallback // storage blocked (private mode, policy) or corrupted value
  }
}

export function writeStored(key: string, value: unknown): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value))
  } catch {
    // Storage unavailable: the preference simply isn't remembered.
  }
}

/**
 * A per-device preference remembered in localStorage. Values read back are validated,
 * so a stale or tampered entry falls back to the default instead of breaking the page.
 */
export function useLocalStorage<T>(
  key: string,
  fallback: T,
  isValid: (value: unknown) => value is T,
): readonly [T, (value: T) => void] {
  const [value, setValue] = useState(() => readStored(key, fallback, isValid))
  useEffect(() => {
    writeStored(key, value)
  }, [key, value])
  return [value, setValue] as const
}

/**
 * Settings object remembered in localStorage. `sanitize` turns whatever is stored (possibly from an
 * older version, or nothing) into valid settings, field by field.
 */
export function useStoredSettings<T>(
  key: string,
  sanitize: (raw: unknown) => T,
): readonly [T, (update: (current: T) => T) => void] {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + key)
      return sanitize(raw === null ? null : (JSON.parse(raw) as unknown))
    } catch {
      return sanitize(null)
    }
  })
  useEffect(() => {
    writeStored(key, value)
  }, [key, value])
  return [value, setValue] as const
}

/** Reads one field of a stored object, keeping it only if it passes `isValid`. */
export function field<T>(
  raw: unknown,
  name: string,
  isValid: (value: unknown) => value is T,
  fallback: T,
): T {
  const value: unknown =
    typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>)[name] : undefined
  return isValid(value) ? value : fallback
}

export const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean'
export const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)
export function isOneOf<T>(values: readonly T[]) {
  return (value: unknown): value is T => (values as readonly unknown[]).includes(value)
}
