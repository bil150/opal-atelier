import { useId, useMemo, useState, type DragEvent } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { BUTTON, BUTTON_GHOST, FIELD, LABEL } from '@renderer/components/ui/buttons'
import { Dialog } from '@renderer/components/ui/Dialog'
import { Segmented } from '@renderer/components/ui/Segmented'
import {
  EXCHANGE_TYPE,
  EXCHANGE_VERSION,
  TUBE_LIMITS,
  exampleSwatchChart,
  exportSwatchChart,
  importSwatchChart,
} from '@renderer/lib/swatch-chart'
import { saveFile } from '@renderer/platform'
import { slugify } from '@renderer/features/image-study/view/image-file'
import { planImport, type ImportPlan } from '../import-plan'
import { MAX_TUBES, groupNames, type PaintTube } from '../paint-tube'
import { useCopyMessage } from '../use-copy-message'
import { ALL_GROUPS, ChartsTab } from './charts-tab'

const MAX_FILE_BYTES = 4 * 1024 * 1024
const SHOWN_REJECTIONS = 8

interface SwatchChartsDialogProps {
  readonly open: boolean
  readonly tab: ChartsTab
  /** Group selected for export when opening from a group's Export button. */
  readonly group: string
  readonly tubes: readonly PaintTube[]
  readonly onTab: (tab: ChartsTab) => void
  readonly onClose: () => void
  readonly onImport: (plan: ImportPlan, markOwned: boolean) => void
}

/** Swatch charts: import a brand's tubes as JSON, export them, and the format with a prompt for an AI. */
export function SwatchChartsDialog({
  open,
  tab,
  group,
  tubes,
  onTab,
  onClose,
  onImport,
}: SwatchChartsDialogProps) {
  const { t } = useTranslation()
  return (
    <Dialog
      open={open}
      title={t('imageStudy.charts.title')}
      closeLabel={t('imageStudy.charts.close')}
      onClose={onClose}
    >
      <p className="text-[13px] text-muted">{t('imageStudy.charts.intro')}</p>
      <Segmented
        label={t('imageStudy.charts.title')}
        value={tab}
        onChange={onTab}
        stretch
        options={Object.values(ChartsTab).map((v) => ({ value: v, label: t(`imageStudy.charts.tabs.${v}`) }))}
      />
      {tab === ChartsTab.Import ? <ImportTab tubes={tubes} onImport={onImport} /> : null}
      {tab === ChartsTab.Export ? <ExportTab key={group} tubes={tubes} initialGroup={group} /> : null}
      {tab === ChartsTab.Format ? <FormatTab /> : null}
    </Dialog>
  )
}

function ImportTab({
  tubes,
  onImport,
}: {
  readonly tubes: readonly PaintTube[]
  readonly onImport: (plan: ImportPlan, markOwned: boolean) => void
}) {
  const { t } = useTranslation()
  const id = useId()
  const [text, setText] = useState('')
  const [fileName, setFileName] = useState('')
  const [fileError, setFileError] = useState('')
  const [markOwned, setMarkOwned] = useState(false)
  const [replace, setReplace] = useState(false)

  const preview = useMemo(() => {
    if (!text.trim()) return null
    const result = importSwatchChart(text)
    if (!result.ok) return { result, plan: null }
    return {
      result,
      plan: planImport(tubes, result.tubes, result.groups, { markOwned, replaceGroups: replace }),
    }
  }, [text, tubes, markOwned, replace])

  const readFile = (file: File | undefined) => {
    if (!file) return
    setFileName(file.name)
    setFileError('')
    if (file.size > MAX_FILE_BYTES) {
      setText('')
      setFileError(t('imageStudy.charts.tooBig'))
      return
    }
    file.text().then(setText, () => setFileError(t('imageStudy.charts.unreadable')))
  }
  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    readFile(e.dataTransfer.files[0])
  }

  let message: { text: string; error: boolean } | null = fileError ? { text: fileError, error: true } : null
  let canImport = false
  if (!message && preview) {
    const { result, plan } = preview
    if (!result.ok) {
      message = {
        text: t(`imageStudy.charts.failures.${result.failure}`, {
          count: result.count,
          max: TUBE_LIMITS.tubesPerFile,
        }),
        error: true,
      }
    } else if (!result.tubes.length) message = { text: t('imageStudy.charts.noValid'), error: true }
    else if (plan && plan.next.length > MAX_TUBES)
      message = { text: t('imageStudy.charts.wouldExceed', { max: MAX_TUBES }), error: true }
    else if (plan) {
      canImport = true
      message = {
        error: false,
        text: t('imageStudy.charts.preview', {
          valid: t('imageStudy.charts.valid', { count: result.tubes.length }),
          groups: t('imageStudy.charts.groups', {
            list: result.groups.map((g) => g || t('imageStudy.charts.noGroup')).join(', '),
          }),
          added: plan.added,
          updated: plan.updated,
          removed: plan.removed ? t('imageStudy.charts.removedPart', { count: plan.removed }) : '',
          rejected: result.rejected.length
            ? t('imageStudy.charts.rejectedPart', { count: result.rejected.length })
            : '',
        }),
      }
    }
  }
  const rejected = preview?.result.ok ? preview.result.rejected : []

  return (
    <section className="flex flex-col gap-3">
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-line p-3"
      >
        <label className={`${BUTTON} cursor-pointer`}>
          {t('imageStudy.charts.pick')}
          <input
            type="file"
            accept=".json,application/json,text/plain"
            className="sr-only"
            onChange={(e) => {
              readFile(e.target.files?.[0])
              e.target.value = ''
            }}
          />
        </label>
        <span className="text-muted">{fileName || t('imageStudy.charts.orDrop')}</span>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor={`${id}-paste`} className={LABEL}>
          {t('imageStudy.charts.paste')}
        </label>
        <textarea
          id={`${id}-paste`}
          rows={6}
          spellCheck={false}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={'{ "group": "My brand", "tubes": [ { "name": "…", "hex": "#RRGGBB" } ] }'}
          className="w-full resize-y rounded-md border border-line bg-paper-2 p-2.5 font-mono text-sm"
        />
      </div>
      <label className="flex min-h-11 items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          checked={markOwned}
          onChange={(e) => setMarkOwned(e.target.checked)}
          className="size-5 accent-ink"
        />
        {t('imageStudy.charts.markOwned')}
      </label>
      <label className="flex min-h-11 items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          checked={replace}
          onChange={(e) => setReplace(e.target.checked)}
          className="size-5 accent-ink"
        />
        {t('imageStudy.charts.replace')}
      </label>
      {message ? (
        <p
          role="status"
          className={`rounded-md border px-3 py-2.5 text-sm ${message.error ? 'border-bad bg-bad-bg text-bad' : 'border-line bg-paper-2'}`}
        >
          {message.text}
        </p>
      ) : null}
      {rejected.length ? (
        <ul className="list-disc pl-5 text-[13px] text-muted">
          {rejected.slice(0, SHOWN_REJECTIONS).map((r) => (
            <li key={r.position}>
              {t('imageStudy.charts.rejected', {
                position: r.position,
                name: r.name ? ` « ${r.name} »` : '',
                reason: t(`imageStudy.charts.rejections.${r.reason}`),
              })}
            </li>
          ))}
          {rejected.length > SHOWN_REJECTIONS ? (
            <li>{t('imageStudy.charts.moreRejected', { count: rejected.length - SHOWN_REJECTIONS })}</li>
          ) : null}
        </ul>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!canImport}
          onClick={() => {
            if (!preview?.plan) return
            onImport(preview.plan, markOwned)
            setText('')
            setFileName('')
          }}
          className={BUTTON}
        >
          {canImport && preview?.result.ok
            ? t('imageStudy.charts.importCount', { count: preview.result.tubes.length })
            : t('imageStudy.charts.import')}
        </button>
        <button
          type="button"
          onClick={() => {
            setText('')
            setFileName('')
            setFileError('')
          }}
          className={BUTTON_GHOST}
        >
          {t('imageStudy.charts.clear')}
        </button>
      </div>
    </section>
  )
}

function ExportTab({
  tubes,
  initialGroup,
}: {
  readonly tubes: readonly PaintTube[]
  readonly initialGroup: string
}) {
  const { t, i18n } = useTranslation()
  const id = useId()
  const names = groupNames(tubes, i18n.resolvedLanguage ?? 'en')
  const loose = tubes.filter((tube) => !tube.group).length
  const valid =
    initialGroup === ALL_GROUPS || names.includes(initialGroup) || (initialGroup === '' && loose > 0)
  const [group, setGroup] = useState(valid ? initialGroup : ALL_GROUPS)
  const [message, copy] = useCopyMessage()
  const list = group === ALL_GROUPS ? tubes : tubes.filter((tube) => tube.group === group)
  const file = exportSwatchChart(list, group === ALL_GROUPS ? null : group)
  const json = JSON.stringify(file, null, 2)
  const fileName = `nuancier-${slugify(group === ALL_GROUPS ? t('imageStudy.charts.fileAll') : group || t('imageStudy.charts.fileNoGroup'), 'nuancier')}.json`

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor={`${id}-group`} className={LABEL}>
          {t('imageStudy.charts.exportGroup')}
        </label>
        <select id={`${id}-group`} value={group} onChange={(e) => setGroup(e.target.value)} className={FIELD}>
          <option value={ALL_GROUPS}>{t('imageStudy.charts.allGroups', { count: tubes.length })}</option>
          {names.map((g) => (
            <option key={g} value={g}>
              {t('imageStudy.charts.groupOption', {
                group: g,
                count: tubes.filter((tube) => tube.group === g).length,
              })}
            </option>
          ))}
          {loose ? (
            <option value="">
              {t('imageStudy.charts.groupOption', { group: t('imageStudy.paints.noGroup'), count: loose })}
            </option>
          ) : null}
        </select>
      </div>
      <p aria-live="polite" className="text-[13px] text-muted">
        {list.length
          ? t('imageStudy.charts.willExport', { count: list.length })
          : t('imageStudy.charts.nothingToExport')}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={!list.length}
          onClick={() =>
            void saveFile(new Blob([json], { type: 'application/json' }), {
              suggestedName: fileName,
              mimeType: 'application/json',
              extensions: ['.json'],
              description: t('imageStudy.charts.title'),
            })
          }
          className={BUTTON}
        >
          {t('imageStudy.charts.download')}
        </button>
        <button type="button" disabled={!list.length} onClick={() => copy(json)} className={BUTTON_GHOST}>
          {t('imageStudy.charts.copy')}
        </button>
        <span aria-live="polite" className="text-[13px] text-muted">
          {message}
        </span>
      </div>
    </section>
  )
}

const FIELDS = ['tubes', 'name', 'hex', 'group', 'pigment', 'light', 'opac', 'effect', 'type'] as const
const RULES = ['update', 'owned', 'invalid', 'paste', 'local'] as const

function FormatTab() {
  const { t } = useTranslation()
  const [message, copy] = useCopyMessage()
  const example = JSON.stringify(exampleSwatchChart(), null, 2)
  const f = (key: 'group' | 'name' | 'pigment' | 'light' | 'opac' | 'effect') =>
    t(`imageStudy.charts.promptFormat.${key}`)
  const format = JSON.stringify(
    {
      type: EXCHANGE_TYPE,
      version: EXCHANGE_VERSION,
      group: f('group'),
      tubes: [
        {
          name: f('name'),
          pigment: f('pigment'),
          hex: '<#RRGGBB>',
          light: f('light'),
          opac: f('opac'),
          effect: f('effect'),
        },
      ],
    },
    null,
    2,
  )
  const prompt = t('imageStudy.charts.prompt', { format })

  return (
    <section className="flex flex-col gap-3 text-sm">
      <h3 className="font-semibold">{t('imageStudy.charts.formatTitle')}</h3>
      <dl className="flex flex-col gap-1.5">
        {FIELDS.map((field) => (
          <div key={field} className="grid gap-x-3 sm:grid-cols-[110px_1fr]">
            <dt>
              <code>{field === 'type' ? 'type, version' : field}</code>
            </dt>
            <dd className="text-muted">
              <Trans i18nKey={`imageStudy.charts.fields.${field}`} components={{ code: <code /> }} />
            </dd>
          </div>
        ))}
      </dl>
      <h3 className="font-semibold">{t('imageStudy.charts.rulesTitle')}</h3>
      <ul className="flex list-disc flex-col gap-1 pl-5">
        {RULES.map((rule) => (
          <li key={rule}>
            <Trans i18nKey={`imageStudy.charts.rules.${rule}`} components={{ code: <code /> }} />
          </li>
        ))}
      </ul>
      <h3 className="font-semibold">{t('imageStudy.charts.exampleTitle')}</h3>
      <pre className="overflow-x-auto rounded-md border border-line bg-paper p-3 font-mono text-xs">
        {example}
      </pre>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => copy(example)} className={BUTTON_GHOST}>
          {t('imageStudy.charts.copyExample')}
        </button>
        <button
          type="button"
          onClick={() =>
            void saveFile(new Blob([example], { type: 'application/json' }), {
              suggestedName: 'nuancier-modele.json',
              mimeType: 'application/json',
              extensions: ['.json'],
              description: t('imageStudy.charts.title'),
            })
          }
          className={BUTTON_GHOST}
        >
          {t('imageStudy.charts.template')}
        </button>
      </div>
      <h3 className="font-semibold">{t('imageStudy.charts.promptTitle')}</h3>
      <p className="text-[13px] text-muted">{t('imageStudy.charts.promptHelp')}</p>
      <textarea
        readOnly
        rows={12}
        spellCheck={false}
        value={prompt}
        aria-label={t('imageStudy.charts.promptTitle')}
        className="w-full rounded-md border border-line bg-paper-2 p-2.5 font-mono text-xs"
      />
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => copy(prompt)} className={BUTTON}>
          {t('imageStudy.charts.copyPrompt')}
        </button>
        <span aria-live="polite" className="text-[13px] text-muted">
          {message}
        </span>
      </div>
    </section>
  )
}
