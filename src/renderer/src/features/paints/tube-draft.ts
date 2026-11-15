/** The tube form's content, and turning it into a saved tube. */
import {
  TUBE_LIMITS,
  cleanText,
  parseHex,
  type Lightfastness,
  type Opacity,
  type SurfaceEffect,
} from '@renderer/lib/swatch-chart'
import { MAX_TUBES, TubeStatus, newTubeId, type PaintTube } from './paint-tube'

export interface TubeDraft {
  readonly name: string
  readonly group: string
  readonly pigment: string
  readonly lightfastness: Lightfastness | null
  readonly opacity: Opacity | null
  readonly effect: SurfaceEffect | null
  readonly status: TubeStatus
  /** Lower-case #rrggbb. */
  readonly hex: string
}

/** A new tube takes the group of the previous one (charts are entered brand by brand). */
export function emptyDraft(lastGroup: string): TubeDraft {
  return {
    name: '',
    group: lastGroup,
    pigment: '',
    lightfastness: null,
    opacity: null,
    effect: null,
    status: TubeStatus.Owned,
    hex: '#808080',
  }
}

export function draftOf(t: PaintTube): TubeDraft {
  return {
    name: t.name,
    group: t.group,
    pigment: t.pigment,
    lightfastness: t.lightfastness,
    opacity: t.opacity,
    effect: t.effect,
    status: t.status,
    hex: t.hex,
  }
}

export enum DraftError {
  MissingName = 'missing-name',
  InvalidColour = 'invalid-colour',
  TooManyTubes = 'too-many-tubes',
}

export type SaveResult =
  | { readonly ok: true; readonly tubes: readonly PaintTube[]; readonly group: string }
  | { readonly ok: false; readonly error: DraftError }

/** Adds the draft as a new tube, or updates the tube being edited. */
export function saveDraft(
  tubes: readonly PaintTube[],
  draft: TubeDraft,
  editingId: string | null,
): SaveResult {
  const name = cleanText(draft.name, TUBE_LIMITS.name)
  if (!name) return { ok: false, error: DraftError.MissingName }
  const hex = parseHex(draft.hex)
  if (!hex) return { ok: false, error: DraftError.InvalidColour }
  const group = cleanText(draft.group, TUBE_LIMITS.group)
  const fields = {
    name,
    group,
    hex,
    pigment: cleanText(draft.pigment, TUBE_LIMITS.pigment).toUpperCase(),
    lightfastness: draft.lightfastness,
    opacity: draft.opacity,
    effect: draft.effect,
    status: draft.status,
  }
  const editing = editingId ? tubes.find((t) => t.id === editingId) : undefined
  if (editing) return { ok: true, group, tubes: tubes.map((t) => (t === editing ? { ...t, ...fields } : t)) }
  if (tubes.length >= MAX_TUBES) return { ok: false, error: DraftError.TooManyTubes }
  return { ok: true, group, tubes: [...tubes, { id: newTubeId(), ...fields }] }
}

/** Status changes from the list: ticking a tube means owning it (so it is no longer to buy). */
export function setStatus(
  tubes: readonly PaintTube[],
  ids: ReadonlySet<string>,
  status: TubeStatus,
): PaintTube[] {
  return tubes.map((t) => (ids.has(t.id) ? { ...t, status } : t))
}

/** Lines of a copied list: group · name (pigment) · HEX. */
export function listText(title: string, tubes: readonly PaintTube[]): string {
  return [
    `${title} (${tubes.length})`,
    ...tubes.map(
      (t) =>
        `${t.group ? `${t.group} · ` : ''}${t.name}${t.pigment ? ` (${t.pigment})` : ''} · ${t.hex.toUpperCase()}`,
    ),
  ].join('\n')
}
