/**
 * What importing a swatch chart would do, without changing anything: same group + same name updates the
 * existing tube (keeping its id and status); a new tube is owned only if asked. "Replace" removes the
 * tubes of the imported groups first ("no group" is never replaced).
 */
import type { Tube } from '@renderer/lib/swatch-chart'
import { newTubeId, TubeStatus, type PaintTube } from './paint-tube'

export interface ImportOptions {
  /** Mark new tubes as owned. */
  readonly markOwned: boolean
  readonly replaceGroups: boolean
}

export interface ImportPlan {
  readonly next: readonly PaintTube[]
  readonly added: number
  readonly updated: number
  readonly removed: number
}

const keyOf = (t: Pick<Tube, 'group' | 'name'>) => `${t.group.toLowerCase()}|${t.name.toLowerCase()}`

export function planImport(
  current: readonly PaintTube[],
  imported: readonly Tube[],
  groups: readonly string[],
  options: ImportOptions,
): ImportPlan {
  const old = new Map(current.map((t) => [keyOf(t), t]))
  const replaced = new Set(options.replaceGroups ? groups.filter(Boolean) : [])
  const next: PaintTube[] = current.filter((t) => !replaced.has(t.group)).map((t) => ({ ...t }))
  const at = new Map(next.map((t, i) => [keyOf(t), i]))
  let added = 0
  let updated = 0

  for (const p of imported) {
    const key = keyOf(p)
    const index = at.get(key)
    const fields = {
      name: p.name,
      pigment: p.pigment,
      hex: p.hex,
      lightfastness: p.lightfastness,
      opacity: p.opacity,
      effect: p.effect,
      group: p.group,
    }
    const existing = index === undefined ? undefined : next[index]
    if (index !== undefined && existing) {
      next[index] = { ...existing, ...fields }
      updated++
      continue
    }
    const previous = old.get(key)
    next.push({
      ...fields,
      id: previous?.id ?? newTubeId(),
      status: previous?.status ?? (options.markOwned ? TubeStatus.Owned : TubeStatus.Catalogue),
    })
    at.set(key, next.length - 1)
    if (previous) updated++
    else added++
  }

  const kept = new Set(next.map((t) => t.id))
  return { next, added, updated, removed: current.filter((t) => !kept.has(t.id)).length }
}
