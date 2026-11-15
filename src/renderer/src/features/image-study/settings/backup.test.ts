import { describe, expect, it } from 'vitest'
import { TubeStatus, sanitizePaintTube } from '@renderer/features/paints/paint-tube'
import { LineStyle, sanitizeGrid } from '../grid/grid-settings'
import {
  BACKUP_APP,
  BackupError,
  ByteUnit,
  backupFileName,
  backupJson,
  formatBytes,
  isBackupError,
  parseBackup,
  storageUsed,
} from './backup'

const blue = sanitizePaintTube({
  id: 'b',
  name: 'Blue',
  hex: '#23308c',
  status: TubeStatus.Owned,
  group: 'Mine',
})!
const date = new Date('2026-11-15T10:00:00Z')

describe('backupJson / parseBackup', () => {
  it('round-trips the tubes and the grid', () => {
    const grid = sanitizeGrid({ cols: 7, color: '#ff0000', lineStyle: LineStyle.Dotted })
    const text = backupJson([blue], grid, date)
    const data = JSON.parse(text) as Record<string, unknown>
    expect(data).toMatchObject({ app: BACKUP_APP, version: 1, exportedAt: '2026-11-15T10:00:00.000Z' })
    const back = parseBackup(text)
    expect(isBackupError(back)).toBe(false)
    if (isBackupError(back)) return
    expect(back.tubes).toEqual([blue])
    expect(back.grid).toEqual(grid)
  })

  it('reads files of the original site (grid under “grille”, active flags)', () => {
    const back = parseBackup(
      JSON.stringify({
        app: 'etude-image',
        version: 1,
        tubes: [{ id: 'x', name: 'Red', hex: '#aa0000', active: true }],
        grille: { cols: 5, dash: 'dot' },
      }),
    )
    if (isBackupError(back)) throw new Error(back)
    expect(back.tubes[0]?.status).toBe(TubeStatus.Owned)
    expect(back.grid?.cols).toBe(5)
    expect(back.grid?.lineStyle).toBe(LineStyle.Dotted)
  })

  it('keeps the current grid when the file has none', () => {
    const back = parseBackup(JSON.stringify({ tubes: [{ name: 'Red', hex: '#aa0000' }] }))
    expect(!isBackupError(back) && back.grid).toBeNull()
  })

  it('explains what is wrong with a file', () => {
    expect(parseBackup('{oops')).toBe(BackupError.Invalid)
    expect(parseBackup('null')).toBe(BackupError.NoTubes)
    expect(parseBackup('{"tubes": {}}')).toBe(BackupError.NoTubes)
    expect(parseBackup('{"tubes": [{"name": ""}]}')).toBe(BackupError.NoValid)
  })

  it('names the file after the day', () => {
    expect(backupFileName(date)).toBe('opal-tubes-2026-11-15.json')
  })
})

describe('storageUsed', () => {
  it('counts the given keys in UTF-16', () => {
    localStorage.setItem('opal:a', '1234')
    localStorage.setItem('other', 'not counted')
    expect(storageUsed(['opal:a', 'opal:missing'])).toBe((6 + 4) * 2)
  })

  it('is null when storage is blocked', () => {
    const blocked = {
      getItem: () => {
        throw new Error('blocked')
      },
    } as unknown as Storage
    expect(storageUsed(['opal:a'], blocked)).toBeNull()
  })
})

describe('formatBytes', () => {
  it('picks the unit that reads best', () => {
    expect(formatBytes(512, 'en')).toEqual({ unit: ByteUnit.Bytes, value: '512' })
    expect(formatBytes(1536, 'en')).toEqual({ unit: ByteUnit.Kilobytes, value: '1.5' })
    expect(formatBytes(1536, 'fr')).toEqual({ unit: ByteUnit.Kilobytes, value: '1,5' })
    expect(formatBytes(3 * 1024 * 1024, 'en')).toEqual({ unit: ByteUnit.Megabytes, value: '3.00' })
  })
})
