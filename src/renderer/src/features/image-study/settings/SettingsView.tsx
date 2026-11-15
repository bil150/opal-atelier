import { useState, type ReactNode } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Note, Panel } from '@renderer/components/ui/Panel'
import { BUTTON_DANGER, BUTTON_GHOST } from '@renderer/components/ui/buttons'
import type { PaintTube } from '@renderer/features/paints/paint-tube'
import type { CalculationOptions } from '@renderer/features/paints/tube-classification'
import { saveFile } from '@renderer/platform/save-file'
import type { GridSettings } from '../grid/grid-settings'
import {
  BACKUP_MAX_BYTES,
  BackupError,
  STORAGE_QUOTA_BYTES,
  backupFileName,
  backupJson,
  formatBytes,
  isBackupError,
  parseBackup,
  type Backup,
} from './backup'

const STEPS = [
  'read',
  'difference',
  'mixing',
  'search',
  'blacks',
  'effects',
  'info',
  'cmyk',
  'chart',
  'zone',
] as const

const BACKUP_ERROR_TEXT = {
  [BackupError.TooBig]: 'imageStudy.settings.backupTooBig',
  [BackupError.Invalid]: 'imageStudy.settings.backupInvalid',
  [BackupError.NoTubes]: 'imageStudy.settings.backupNoTubes',
  [BackupError.NoValid]: 'imageStudy.settings.backupNoValid',
} as const

interface SettingsViewProps {
  readonly options: CalculationOptions
  readonly onOptions: (options: CalculationOptions) => void
  readonly tubes: readonly PaintTube[]
  readonly grid: GridSettings
  /** Bytes this tool keeps on the device; null when storage is unavailable. */
  readonly storageBytes: number | null
  /** Replaces the tubes (and the grid when the file has one). */
  readonly onRestore: (backup: Backup) => void
  readonly onClearCache: () => void
  readonly onWipe: () => void
}

/** Calculation options, storage, backup, maintenance, and how the results are computed. */
export function SettingsView({
  options,
  onOptions,
  tubes,
  grid,
  storageBytes,
  onRestore,
  onClearCache,
  onWipe,
}: SettingsViewProps) {
  const { t, i18n } = useTranslation()
  const [message, setMessage] = useState<{ text: string; bad: boolean } | null>(null)
  const say = (text: string, bad = false) => setMessage({ text, bad })
  const tubeCount = t('imageStudy.paints.tubes', { count: tubes.length })

  const exportTubes = async () => {
    const now = new Date()
    await saveFile(new Blob([backupJson(tubes, grid, now)], { type: 'application/json' }), {
      suggestedName: backupFileName(now),
      mimeType: 'application/json',
      extensions: ['.json'],
      description: 'JSON',
    })
    say(t('imageStudy.settings.exported', { tubes: tubeCount }))
  }

  const importTubes = async (file: File | undefined) => {
    if (!file) return
    if (file.size > BACKUP_MAX_BYTES) {
      say(t(BACKUP_ERROR_TEXT[BackupError.TooBig]), true)
      return
    }
    let text: string
    try {
      text = await file.text()
    } catch {
      say(t('imageStudy.settings.backupUnreadable'), true)
      return
    }
    const backup = parseBackup(text)
    if (isBackupError(backup)) {
      say(t(BACKUP_ERROR_TEXT[backup]), true)
      return
    }
    if (
      tubes.length &&
      !window.confirm(
        t('imageStudy.settings.replaceConfirm', { current: tubes.length, count: backup.tubes.length }),
      )
    )
      return
    onRestore(backup)
    say(
      t('imageStudy.settings.importedTubes', {
        tubes: t('imageStudy.paints.tubes', { count: backup.tubes.length }),
      }),
    )
  }

  const size = storageBytes === null ? null : formatBytes(storageBytes, i18n.resolvedLanguage ?? 'en')
  const usage =
    storageBytes === null
      ? 0
      : Math.min(100, Math.max(storageBytes ? 2 : 0, (storageBytes / STORAGE_QUOTA_BYTES) * 100))

  const option = (key: keyof CalculationOptions, label: string, note: string, why: ReactNode) => (
    <div className="flex flex-col gap-1.5">
      <label className="flex items-start gap-2 text-sm font-medium">
        <input
          type="checkbox"
          checked={options[key]}
          onChange={(e) => onOptions({ ...options, [key]: e.target.checked })}
          className="mt-0.5"
        />
        {label}
      </label>
      <Note>{note}</Note>
      <p className="text-[13px] text-muted">{why}</p>
    </div>
  )

  return (
    <div className="grid items-start gap-3 md:grid-cols-2">
      {message ? (
        <p
          role={message.bad ? 'alert' : 'status'}
          className={`rounded-md border px-3 py-2.5 text-sm md:col-span-2 ${message.bad ? 'border-bad bg-bad-bg text-bad' : 'border-line'}`}
        >
          {message.text}
        </p>
      ) : null}
      <Panel title={t('imageStudy.settings.calculation')}>
        {option(
          'excludeBlacks',
          t('imageStudy.settings.excludeBlacks'),
          t('imageStudy.settings.excludeBlacksNote'),
          <Trans i18nKey="imageStudy.settings.excludeBlacksWhy" />,
        )}
        {option(
          'excludeEffects',
          t('imageStudy.settings.excludeEffects'),
          t('imageStudy.settings.excludeEffectsNote'),
          <Trans i18nKey="imageStudy.settings.excludeEffectsWhy" />,
        )}
      </Panel>
      <div className="flex flex-col gap-3">
        <Panel title={t('imageStudy.settings.storage')}>
          <p className="text-lg font-semibold tabular-nums">
            {size
              ? t(`imageStudy.settings.${size.unit}`, { value: size.value })
              : t('imageStudy.settings.unavailable')}
          </p>
          <span aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-line">
            <i className="block h-full bg-ink" style={{ width: `${usage}%` }} />
          </span>
          <Note>{t('imageStudy.settings.storageDetail', { tubes: tubeCount })}</Note>
        </Panel>
        <Panel title={t('imageStudy.settings.backup')}>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void exportTubes()} className={BUTTON_GHOST}>
              {t('imageStudy.settings.exportTubes')}
            </button>
            <label className={`${BUTTON_GHOST} cursor-pointer`}>
              {t('imageStudy.settings.importTubes')}
              <input
                type="file"
                accept="application/json,.json"
                className="sr-only"
                onChange={(e) => {
                  void importTubes(e.target.files?.[0])
                  e.target.value = ''
                }}
              />
            </label>
          </div>
        </Panel>
        <Panel title={t('imageStudy.settings.maintenance')}>
          <button
            type="button"
            onClick={() => {
              onClearCache()
              say(t('imageStudy.settings.cacheCleared'))
            }}
            className={`${BUTTON_GHOST} self-start`}
          >
            {t('imageStudy.settings.clearCache')}
          </button>
          <Note>{t('imageStudy.settings.clearCacheNote')}</Note>
        </Panel>
        <Panel title={t('imageStudy.settings.danger')}>
          <button
            type="button"
            onClick={() => {
              if (!window.confirm(t('imageStudy.settings.wipeConfirm'))) return
              onWipe()
              say(t('imageStudy.settings.wiped'))
            }}
            className={`${BUTTON_DANGER} self-start`}
          >
            {t('imageStudy.settings.wipe')}
          </button>
          <Note>{t('imageStudy.settings.wipeNote')}</Note>
        </Panel>
      </div>
      <Panel title={t('imageStudy.settings.method')} className="md:col-span-2" as="article">
        <p className="text-sm font-medium">{t('imageStudy.settings.methodWarning')}</p>
        <ol className="m-0 flex list-decimal flex-col gap-2.5 pl-5">
          {STEPS.map((step) => {
            const [title, text] = t(`imageStudy.settings.steps.${step}`, { returnObjects: true })
            return (
              <li key={step} className="text-sm">
                <b>{title}</b> — {text}
              </li>
            )
          })}
        </ol>
      </Panel>
    </div>
  )
}
