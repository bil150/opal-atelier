/**
 * "Paints for this image": the image's colours at a chosen precision, the paints studied (owned ones and
 * those of the ticked collections), and the lists of a proposal.
 */
import { TubeStatus, tubeLabel, type PaintTube } from '@renderer/features/paints/paint-tube'
import { exclusionOf, type CalculationOptions } from '@renderer/features/paints/tube-classification'
import {
  allColours,
  dominantColours,
  proposePaints,
  type PaintProposals,
  type PixelData,
  type Proposal,
  type WeightedColour,
} from '@renderer/lib/paint-mixer'
import { hexToRgb } from '@renderer/lib/pixels'
import { PRECISION_LEVELS } from './recipe-logic'

/** At most this many paints to buy. */
const MAX_EXTRA = 6

/** Collections: the groups, sorted, then "" when some tubes have none. */
export function collectionNames(tubes: readonly PaintTube[], locale: string): string[] {
  const names = [...new Set(tubes.map((t) => t.group).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, locale),
  )
  return tubes.some((t) => !t.group) ? [...names, ''] : names
}

/** Owned paints always count; others when their collection is ticked. Excluded paints never. */
export function imagePaintPool(
  tubes: readonly PaintTube[],
  unticked: ReadonlySet<string>,
  options: CalculationOptions,
): PaintTube[] {
  return tubes.filter(
    (t) => (t.status === TubeStatus.Owned || !unticked.has(t.group)) && exclusionOf(t, options) === null,
  )
}

/** Side of the reduced image read at a precision level (every point: 128 px; dominant colours: 64 px). */
export function sampleSide(level: number): number {
  return PRECISION_LEVELS[level] === null ? 128 : 64
}

/** Image colours at a precision level: its k dominant colours, or every point. */
export function imageTargets(pixels: PixelData, level: number): WeightedColour[] {
  const k = PRECISION_LEVELS[level]
  return k === null || k === undefined ? allColours(pixels) : dominantColours(pixels, k)
}

export function proposeImagePaints(
  targets: readonly WeightedColour[],
  pool: readonly PaintTube[],
): PaintProposals {
  return proposePaints(
    targets,
    pool.map((t) => ({ id: t.id, rgb: hexToRgb(t.hex), owned: t.status === TubeStatus.Owned })),
    { maxExtra: MAX_EXTRA },
  )
}

export interface ProposalLists {
  readonly proposal: Proposal
  /** Owned paints this proposal uses. */
  readonly owned: readonly PaintTube[]
  readonly toBuy: readonly PaintTube[]
}

/** The two lists of proposal `pick`; tubes deleted meanwhile are skipped. */
export function proposalLists(
  result: PaintProposals,
  pick: number,
  tubes: readonly PaintTube[],
): ProposalLists | null {
  const proposal = result.proposals[pick]
  if (!proposal) return null
  const byId = new Map(tubes.map((t) => [t.id, t]))
  const find = (ids: readonly string[]) => ids.flatMap((id) => byId.get(id) ?? [])
  return {
    proposal,
    owned: find(result.owned.filter((id) => (proposal.usage[id] ?? 0) > 0)),
    toBuy: find(result.toBuy.slice(0, proposal.extraCount)),
  }
}

/** Percentage gain in faithful share over the previous proposal; null for the first or when 0. */
export function coverageGain(proposals: readonly Proposal[], k: number): number | null {
  const previous = proposals[k - 1]
  const current = proposals[k]
  if (!previous || !current || previous.meanDeltaE === null) return null
  return Math.round((current.coverage - previous.coverage) * 100) || null
}

/** One line of the copied list: "- Name (Group) (PB29)". */
export function paintLine(t: PaintTube): string {
  return `- ${tubeLabel(t)}${t.pigment ? ` (${t.pigment})` : ''}`
}
