import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { TOOL_BUTTON } from '@renderer/components/ui/buttons'
import { foldText } from '@renderer/lib/swatch-chart'
import { TubeStatus, groupNames, tubeLabel, type PaintTube } from '../paint-tube'
import type { CalculationOptions } from '../tube-classification'
import { matchesFilter, matchesTubeQuery, type TubeFilter } from '../tube-filter'
import { CopyNameButton } from './CopyButton'
import { TubeTags } from './TubeTags'

interface TubeListProps {
  readonly tubes: readonly PaintTube[]
  readonly filter: TubeFilter
  readonly query: string
  readonly options: CalculationOptions
  readonly onStatus: (ids: ReadonlySet<string>, status: TubeStatus) => void
  readonly onEdit: (tube: PaintTube) => void
  readonly onDelete: (tube: PaintTube) => void
  readonly onExportGroup: (group: string) => void
}

/** Big charts open folded; during a search, groups with results open. */
const FOLD_FROM = 40

/** The user's tubes, by group (folding sections) or as a plain list when there are no groups. */
export function TubeList({
  tubes,
  filter,
  query,
  options,
  onStatus,
  onEdit,
  onDelete,
  onExportGroup,
}: TubeListProps) {
  const { t, i18n } = useTranslation()
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})
  const words = foldText(query).split(/\s+/).filter(Boolean)
  const visible = (tube: PaintTube) => matchesFilter(tube, filter) && matchesTubeQuery(tube, words)

  if (tubes.length && !tubes.some(visible)) {
    return (
      <p className="text-muted">
        {words.length ? t('imageStudy.paints.noMatch') : t('imageStudy.paints.emptyList')}
      </p>
    )
  }
  if (!tubes.some((tube) => tube.group)) {
    return (
      <ul className="flex flex-col">
        {tubes.filter(visible).map((tube) => (
          <TubeItem
            key={tube.id}
            tube={tube}
            options={options}
            onStatus={onStatus}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </ul>
    )
  }

  const groups = [
    ...groupNames(tubes, i18n.resolvedLanguage ?? 'en'),
    ...(tubes.some((tube) => !tube.group) ? [''] : []),
  ]
  return (
    <div className="flex flex-col gap-2">
      {groups.map((group) => {
        const all = tubes.filter((tube) => tube.group === group)
        const list = all.filter(visible)
        if (!list.length) return null
        const open = words.length ? true : (openGroups[group] ?? list.length <= FOLD_FROM)
        const name = group || t('imageStudy.paints.noGroup')
        const owned = all.filter((tube) => tube.status === TubeStatus.Owned).length
        const wanted = all.filter((tube) => tube.status === TubeStatus.Wanted).length
        const shownOwned = list.filter((tube) => tube.status === TubeStatus.Owned).length
        return (
          <details
            key={group}
            open={open}
            onToggle={(e) => {
              const isOpen = e.currentTarget.open
              if (!words.length && isOpen !== open) setOpenGroups((g) => ({ ...g, [group]: isOpen }))
            }}
            className="rounded-lg border border-line"
          >
            <summary className="flex cursor-pointer list-none items-center gap-2.5 px-3 py-2">
              <GroupCheckbox
                checked={shownOwned > 0 && shownOwned === list.length}
                indeterminate={shownOwned > 0 && shownOwned < list.length}
                label={t('imageStudy.paints.useGroup', { group: name })}
                onChange={(checked) =>
                  onStatus(
                    new Set(list.map((tube) => tube.id)),
                    checked ? TubeStatus.Owned : TubeStatus.Catalogue,
                  )
                }
              />
              <b className="min-w-0 flex-1 truncate">{name}</b>
              <span className="text-[13px] text-muted">
                {t('imageStudy.paints.groupCount', { owned, total: all.length })}
                {wanted ? t('imageStudy.paints.groupWanted', { count: wanted }) : ''}
              </span>
              <button
                type="button"
                aria-label={t('imageStudy.paints.exportGroupLabel', { group: name })}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onExportGroup(group)
                }}
                className={TOOL_BUTTON}
              >
                {t('imageStudy.paints.exportGroup')}
              </button>
            </summary>
            <ul className="flex flex-col border-t border-line">
              {list.map((tube) => (
                <TubeItem
                  key={tube.id}
                  tube={tube}
                  options={options}
                  onStatus={onStatus}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}
            </ul>
          </details>
        )
      })}
    </div>
  )
}

function GroupCheckbox({
  checked,
  indeterminate,
  label,
  onChange,
}: {
  readonly checked: boolean
  readonly indeterminate: boolean
  readonly label: string
  readonly onChange: (checked: boolean) => void
}) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate
  }, [indeterminate])
  return (
    // The checkbox must not fold the group.
    <label onClick={(e) => e.stopPropagation()} className="grid size-8 place-items-center">
      <input
        ref={ref}
        type="checkbox"
        checked={checked}
        aria-label={label}
        onChange={(e) => onChange(e.target.checked)}
        className="size-5 accent-ink"
      />
    </label>
  )
}

function TubeItem({
  tube,
  options,
  onStatus,
  onEdit,
  onDelete,
}: {
  readonly tube: PaintTube
  readonly options: CalculationOptions
  readonly onStatus: (ids: ReadonlySet<string>, status: TubeStatus) => void
  readonly onEdit: (tube: PaintTube) => void
  readonly onDelete: (tube: PaintTube) => void
}) {
  const { t } = useTranslation()
  const owned = tube.status === TubeStatus.Owned
  const wanted = tube.status === TubeStatus.Wanted
  const only = new Set([tube.id])
  return (
    <li
      className={`grid grid-cols-[auto_auto_minmax(0,1fr)] items-center gap-x-2.5 gap-y-1.5 border-b border-line px-2 py-2 last:border-b-0 sm:grid-cols-[auto_auto_minmax(0,1fr)_auto] ${owned ? '' : 'opacity-70'}`}
    >
      <label className="grid size-8 place-items-center">
        <input
          type="checkbox"
          checked={owned}
          aria-label={t('imageStudy.paints.use', { name: tube.name })}
          onChange={(e) => onStatus(only, e.target.checked ? TubeStatus.Owned : TubeStatus.Catalogue)}
          className="size-5 accent-ink"
        />
      </label>
      <span className="size-8 rounded-md border border-line" style={{ background: tube.hex }} />
      <span className="flex min-w-0 flex-col">
        <b className="truncate text-sm">{tube.name}</b>
        <span className="text-xs text-muted">
          {tube.pigment ? `${tube.pigment} · ` : ''}
          {tube.hex.toUpperCase()}
        </span>
        <TubeTags tube={tube} options={options} />
      </span>
      <span className="col-span-full flex flex-wrap justify-end gap-1.5 sm:col-span-1">
        <CopyNameButton text={tubeLabel(tube)} />
        {owned ? (
          <button
            type="button"
            title={t('imageStudy.paints.rebuyTitle')}
            aria-label={t('imageStudy.paints.rebuyLabel', { name: tube.name })}
            onClick={() => onStatus(only, TubeStatus.Wanted)}
            className={TOOL_BUTTON}
          >
            {t('imageStudy.paints.rebuy')}
          </button>
        ) : (
          <button
            type="button"
            aria-pressed={wanted}
            aria-label={
              wanted
                ? t('imageStudy.paints.wantOff', { name: tube.name })
                : t('imageStudy.paints.wantOn', { name: tube.name })
            }
            onClick={() => onStatus(only, wanted ? TubeStatus.Catalogue : TubeStatus.Wanted)}
            className={TOOL_BUTTON}
          >
            {t('imageStudy.paints.want')}
          </button>
        )}
        <button
          type="button"
          aria-label={t('imageStudy.paints.editLabel', { name: tube.name })}
          onClick={() => onEdit(tube)}
          className={TOOL_BUTTON}
        >
          {t('imageStudy.paints.edit')}
        </button>
        <button
          type="button"
          aria-label={t('imageStudy.paints.deleteLabel', { name: tube.name })}
          onClick={() => onDelete(tube)}
          className={`${TOOL_BUTTON} text-bad`}
        >
          {t('imageStudy.paints.delete')}
        </button>
      </span>
    </li>
  )
}
