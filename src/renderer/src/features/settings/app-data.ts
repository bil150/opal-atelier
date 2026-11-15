/** Everything Opal Atelier keeps on this device, measured and deleted as a whole. */
import { LEGACY_TUBES_KEY, getTubeStore } from '@renderer/features/paints/tube-store'
import { STORAGE_PREFIX } from '@renderer/hooks/use-local-storage'
import { Backdrop, setBackdrop } from '@renderer/theme/backdrop'
import { DEFAULT_COLOR_SCHEME, setColorScheme } from '@renderer/theme/color-scheme'

function appKeys(storage: Storage): string[] {
  const keys: string[] = []
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i)
    if (key?.startsWith(STORAGE_PREFIX)) keys.push(key)
  }
  return keys
}

/** Bytes used by the app's own entries (UTF-16: two bytes a character); null when storage is blocked. */
export function appStorageBytes(storage: Storage = localStorage): number | null {
  try {
    return appKeys(storage).reduce(
      (total, key) => total + (key.length + (storage.getItem(key) ?? '').length) * 2,
      0,
    )
  } catch {
    return null
  }
}

/**
 * Deletes every entry of the app (and the original site's tubes, so they aren't copied back), then puts
 * the live stores back to their defaults. Other sites of the same origin are left alone.
 */
export function wipeAppData(storage: Storage = localStorage): void {
  try {
    for (const key of appKeys(storage)) storage.removeItem(key)
    storage.removeItem(LEGACY_TUBES_KEY)
  } catch {
    // storage blocked: nothing was kept anyway
  }
  getTubeStore().update(() => [])
  setBackdrop(Backdrop.Neutral)
  setColorScheme(DEFAULT_COLOR_SCHEME)
}
