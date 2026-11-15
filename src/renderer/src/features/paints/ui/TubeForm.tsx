import { useId, useState, type SyntheticEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { BUTTON, BUTTON_GHOST, FIELD, LABEL } from '@renderer/components/ui/buttons'
import { hexToRgb } from '@renderer/lib/pixels'
import {
  Lightfastness,
  Opacity,
  SurfaceEffect,
  parseHex,
  toLightfastness,
  toOpacity,
  toSurfaceEffect,
} from '@renderer/lib/swatch-chart'
import { TubeStatus } from '../paint-tube'
import { DraftError, type TubeDraft } from '../tube-draft'

interface TubeFormProps {
  readonly draft: TubeDraft
  readonly editing: boolean
  readonly groups: readonly string[]
  readonly error: DraftError | null
  readonly onChange: (draft: TubeDraft) => void
  readonly onSubmit: () => void
  readonly onCancel: () => void
  /** Put the cursor in the name field when the form opens (not when a chart click opens it). */
  readonly focusName: boolean
}

const toHex2 = (n: number) => n.toString(16).padStart(2, '0')
const isStatus = (v: string): v is TubeStatus => (Object.values(TubeStatus) as string[]).includes(v)

/** Add or edit a tube. Picker, HEX and R G B stay in sync. */
export function TubeForm({
  draft,
  editing,
  groups,
  error,
  onChange,
  onSubmit,
  onCancel,
  focusName,
}: TubeFormProps) {
  const { t } = useTranslation()
  const id = useId()
  const set = (patch: Partial<TubeDraft>) => onChange({ ...draft, ...patch })
  const [hexText, setHexText] = useState(draft.hex)
  const rgb = hexToRgb(draft.hex)
  const [rgbText, setRgbText] = useState([String(rgb.r), String(rgb.g), String(rgb.b)])

  // When the colour changes from outside (chart click, picker), the text fields follow.
  const [syncedHex, setSyncedHex] = useState(draft.hex)
  if (syncedHex !== draft.hex) {
    setSyncedHex(draft.hex)
    setHexText(draft.hex)
    setRgbText([String(rgb.r), String(rgb.g), String(rgb.b)])
  }

  const setRgb = (index: number, text: string) => {
    const next = rgbText.map((v, i) => (i === index ? text : v))
    setRgbText(next)
    const values = next.map((v) => (v === '' ? NaN : Math.min(255, Math.max(0, Math.trunc(Number(v))))))
    if (values.every((v) => Number.isFinite(v))) set({ hex: `#${values.map(toHex2).join('')}` })
  }

  const submit = (e: SyntheticEvent) => {
    e.preventDefault()
    onSubmit()
  }

  const field = (name: string) => `${id}-${name}`
  const select = 'min-h-11 w-full rounded-md border border-line bg-paper-2 px-2'

  return (
    <form
      onSubmit={submit}
      noValidate
      autoComplete="off"
      className="flex flex-col gap-3 rounded-lg border border-line p-3.5"
    >
      <h3 className="font-semibold">{editing ? t('imageStudy.form.edit') : t('imageStudy.form.new')}</h3>
      <div className="flex flex-col gap-1">
        <label htmlFor={field('name')} className={LABEL}>
          {t('imageStudy.form.name')}
        </label>
        <input
          id={field('name')}
          value={draft.name}
          maxLength={60}
          required
          autoFocus={focusName}
          onChange={(e) => set({ name: e.target.value })}
          className={FIELD}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor={field('group')} className={LABEL}>
          {t('imageStudy.form.group')}
        </label>
        <input
          id={field('group')}
          value={draft.group}
          list={field('groups')}
          maxLength={40}
          placeholder={t('imageStudy.form.optional')}
          onChange={(e) => set({ group: e.target.value })}
          className={FIELD}
        />
        <datalist id={field('groups')}>
          {groups.map((g) => (
            <option key={g} value={g} />
          ))}
        </datalist>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor={field('pigment')} className={LABEL}>
          {t('imageStudy.form.pigment')}
        </label>
        <input
          id={field('pigment')}
          value={draft.pigment}
          maxLength={20}
          spellCheck={false}
          autoCapitalize="characters"
          placeholder={t('imageStudy.form.pigmentPlaceholder')}
          onChange={(e) => set({ pigment: e.target.value })}
          className={FIELD}
        />
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor={field('light')} className={LABEL}>
            {t('imageStudy.form.lightfastness')}
          </label>
          <select
            id={field('light')}
            value={draft.lightfastness ?? ''}
            onChange={(e) => set({ lightfastness: toLightfastness(e.target.value) })}
            className={select}
          >
            <option value="">{t('imageStudy.lightfastness.none')}</option>
            {Object.values(Lightfastness).map((l) => (
              <option key={l} value={l}>
                {l} – {t(`imageStudy.lightfastness.${l}`)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={field('status')} className={LABEL}>
            {t('imageStudy.form.status')}
          </label>
          <select
            id={field('status')}
            value={draft.status}
            onChange={(e) => {
              if (isStatus(e.target.value)) set({ status: e.target.value })
            }}
            className={select}
          >
            {Object.values(TubeStatus).map((s) => (
              <option key={s} value={s}>
                {t(`imageStudy.status.${s}`)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={field('opac')} className={LABEL}>
            {t('imageStudy.form.opacity')}
          </label>
          <select
            id={field('opac')}
            value={draft.opacity ?? ''}
            onChange={(e) => set({ opacity: toOpacity(e.target.value) })}
            className={select}
          >
            <option value="">{t('imageStudy.opacity.none')}</option>
            {Object.values(Opacity).map((o) => (
              <option key={o} value={o}>
                {t(`imageStudy.opacity.${o}`)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={field('effect')} className={LABEL}>
            {t('imageStudy.form.effect')}
          </label>
          <select
            id={field('effect')}
            value={draft.effect ?? ''}
            onChange={(e) => set({ effect: toSurfaceEffect(e.target.value) })}
            className={select}
          >
            <option value="">{t('imageStudy.effect.auto')}</option>
            {Object.values(SurfaceEffect).map((ef) => (
              <option key={ef} value={ef}>
                {t(`imageStudy.effect.${ef}`)}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex flex-wrap items-end gap-2.5">
        <div className="flex flex-col gap-1">
          <label htmlFor={field('pick')} className={LABEL}>
            {t('imageStudy.form.colour')}
          </label>
          <input
            id={field('pick')}
            type="color"
            value={draft.hex}
            onChange={(e) => set({ hex: e.target.value })}
            className="h-11 w-16 cursor-pointer rounded-md border border-line bg-paper-2 p-1"
          />
        </div>
        <div className="flex w-28 flex-col gap-1">
          <label htmlFor={field('hex')} className={LABEL}>
            {t('imageStudy.form.hex')}
          </label>
          <input
            id={field('hex')}
            value={hexText}
            maxLength={7}
            spellCheck={false}
            autoCapitalize="off"
            onChange={(e) => {
              setHexText(e.target.value)
              const hex = parseHex(e.target.value)
              if (hex) set({ hex })
            }}
            onBlur={() => setHexText(draft.hex)} // an invalid entry goes back to the valid colour
            className={`${FIELD} font-mono`}
          />
        </div>
        {(['r', 'g', 'b'] as const).map((channel, i) => (
          <div key={channel} className="flex w-[4.5rem] flex-col gap-1">
            <label htmlFor={field(channel)} className={LABEL}>
              {t(`imageStudy.form.${channel}`)}
            </label>
            <input
              id={field(channel)}
              type="number"
              min={0}
              max={255}
              step={1}
              inputMode="numeric"
              value={rgbText[i]}
              onChange={(e) => setRgb(i, e.target.value)}
              className={FIELD}
            />
          </div>
        ))}
      </div>
      {error ? (
        <p role="alert" className="rounded-md border border-bad bg-bad-bg px-3 py-2.5 text-sm text-bad">
          {error === DraftError.MissingName
            ? t('imageStudy.form.nameMissing')
            : error === DraftError.InvalidColour
              ? t('imageStudy.form.colourInvalid')
              : t('imageStudy.paints.limit', { max: 1000 })}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button type="submit" className={BUTTON}>
          {editing ? t('imageStudy.form.save') : t('imageStudy.form.add')}
        </button>
        <button type="button" onClick={onCancel} className={BUTTON_GHOST}>
          {t('imageStudy.form.cancel')}
        </button>
      </div>
    </form>
  )
}
