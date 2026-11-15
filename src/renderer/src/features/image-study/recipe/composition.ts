/**
 * The composition shown in the Recipe panel: the solver's first answer, one of its variants, or rows
 * edited by hand. Pure state transitions, so the panel only renders.
 */
import type { PaintTube } from '@renderer/features/paints/paint-tube'
import type { MixRecipe, MixSolution, Rgb } from '@renderer/lib/paint-mixer'
import { MAX_ROWS, MAX_ROW_PARTS, evaluateRows, rowsOf, type CompositionRow } from './recipe-logic'

export interface Composition {
  readonly rows: readonly CompositionRow[]
  /** Index of the solver variant shown; null once edited by hand. */
  readonly variant: number | null
}

/** All the compositions the solver offers: its best one first, then the others. */
export function variantsOf(solution: MixSolution): readonly MixRecipe[] {
  return solution.alternatives.length ? solution.alternatives : [solution.best]
}

/** Variant k of the solution (null = back to the first one). */
export function pickVariant(solution: MixSolution, k: number): Composition | null {
  const recipe = variantsOf(solution)[k]
  return !recipe || k === 0 ? null : { rows: rowsOf(recipe), variant: k }
}

/** The next variant, wrapping round; from a hand edit, the second one. */
export function nextVariant(solution: MixSolution, current: Composition | null): Composition | null {
  const count = variantsOf(solution).length
  if (count < 2) return current
  return pickVariant(solution, ((current?.variant ?? 0) + 1) % count)
}

/** The recipe to show: the solver's own result for a variant, the evaluated rows for a hand edit. */
export function shownRecipe(
  solution: MixSolution,
  composition: Composition | null,
  target: Rgb,
  active: readonly PaintTube[],
): MixRecipe {
  if (!composition) return solution.best
  if (composition.variant !== null) return variantsOf(solution)[composition.variant] ?? solution.best
  return evaluateRows(target, composition.rows, active) ?? solution.best
}

function edited(
  solution: MixSolution,
  composition: Composition | null,
  change: (rows: CompositionRow[]) => void,
): Composition {
  const rows = [...(composition?.rows ?? rowsOf(solution.best))]
  change(rows)
  return { rows, variant: null }
}

const clampParts = (parts: number) => Math.min(MAX_ROW_PARTS, Math.max(1, Math.round(parts)))

export function setRowParts(
  solution: MixSolution,
  composition: Composition | null,
  index: number,
  parts: number,
): Composition {
  return edited(solution, composition, (rows) => {
    const row = rows[index]
    if (row && Number.isFinite(parts)) rows[index] = { ...row, parts: clampParts(parts) }
  })
}

export function setRowTube(
  solution: MixSolution,
  composition: Composition | null,
  index: number,
  id: string,
): Composition {
  return edited(solution, composition, (rows) => {
    const row = rows[index]
    if (row && !rows.some((r, i) => i !== index && r.id === id)) rows[index] = { ...row, id }
  })
}

/** Removes a row; the last one stays. */
export function removeRow(
  solution: MixSolution,
  composition: Composition | null,
  index: number,
): Composition {
  return edited(solution, composition, (rows) => {
    if (rows.length > 1) rows.splice(index, 1)
  })
}

/** Adds a paint with one part, at most MAX_ROWS rows and never twice the same. */
export function addRow(solution: MixSolution, composition: Composition | null, id: string): Composition {
  return edited(solution, composition, (rows) => {
    if (rows.length < MAX_ROWS && !rows.some((r) => r.id === id)) rows.push({ id, parts: 1 })
  })
}

/** Ticked paints that can still be added to the rows. */
export function addablePaints(active: readonly PaintTube[], rows: readonly CompositionRow[]): PaintTube[] {
  return rows.length >= MAX_ROWS ? [] : active.filter((t) => !rows.some((r) => r.id === t.id))
}
