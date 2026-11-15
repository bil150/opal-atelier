/**
 * Backup of the tubes (and grid settings) as a JSON file, its reading back, and the size of what this
 * tool keeps on the device. Files from the original site (app "etude-image", grid under "grille") are read.
 */
import { sanitizeTubeList, toStoredTube, type PaintTube } from '@renderer/features/paints/paint-tube'
import { sanitizeGrid, type GridSettings } from '../grid/grid-settings'

export const BACKUP_APP = 'opal-atelier'
export const BACKUP_VERSION = 1
/** Larger files are refused before reading. */
export const BACKUP_MAX_BYTES = 2 * 1024 * 1024
/** Rough localStorage quota of browsers, for the usage bar. */
export const STORAGE_QUOTA_BYTES = 5 * 1024 * 1024

export enum BackupError {
  TooBig = 'too-big',
  Invalid = 'invalid',
  NoTubes = 'no-tubes',
  NoValid = 'no-valid',
}

export interface Backup {
  readonly tubes: PaintTube[]
  /** Grid settings when the file has them. */
  readonly grid: GridSettings | null
}

export function backupJson(tubes: readonly PaintTube[], grid: GridSettings, now: Date = new Date()): string {
  return JSON.stringify(
    {
      app: BACKUP_APP,
      version: BACKUP_VERSION,
      exportedAt: now.toISOString(),
      tubes: tubes.map(toStoredTube),
      grid,
    },
    null,
    2,
  )
}

/** "opal-tubes-2026-11-15.json" */
export function backupFileName(now: Date = new Date()): string {
  return `opal-tubes-${now.toISOString().slice(0, 10)}.json`
}

export function parseBackup(text: string): Backup | BackupError {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return BackupError.Invalid
  }
  if (typeof data !== 'object' || data === null || !('tubes' in data) || !Array.isArray(data.tubes))
    return BackupError.NoTubes
  const tubes = sanitizeTubeList(data.tubes)
  if (!tubes.length) return BackupError.NoValid
  const rawGrid = 'grid' in data ? data.grid : 'grille' in data ? data.grille : null
  return { tubes, grid: rawGrid ? sanitizeGrid(rawGrid) : null }
}

export function isBackupError(value: Backup | BackupError): value is BackupError {
  return typeof value === 'string'
}

/** Bytes used by the given full keys (UTF-16: two bytes a character); null when storage is unavailable. */
export function storageUsed(keys: readonly string[], storage: Storage = localStorage): number | null {
  try {
    return keys.reduce((total, key) => {
      const value = storage.getItem(key)
      return value === null ? total : total + (key.length + value.length) * 2
    }, 0)
  } catch {
    return null
  }
}

export enum ByteUnit {
  Bytes = 'bytes',
  Kilobytes = 'kb',
  Megabytes = 'mb',
}

/** A size in the unit that reads best, with its number already formatted for the locale. */
export function formatBytes(
  bytes: number,
  locale: string,
): { readonly unit: ByteUnit; readonly value: string } {
  if (bytes < 1024) return { unit: ByteUnit.Bytes, value: String(bytes) }
  const format = (n: number, digits: number) =>
    new Intl.NumberFormat(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n)
  if (bytes < 1024 * 1024) return { unit: ByteUnit.Kilobytes, value: format(bytes / 1024, 1) }
  return { unit: ByteUnit.Megabytes, value: format(bytes / 1024 / 1024, 2) }
}
