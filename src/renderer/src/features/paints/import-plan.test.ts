/** Characterisation tests against the original page's import (tests/fixtures/image-study.json). */
import { describe, expect, it } from 'vitest'
import original from '@tests/fixtures/image-study.json'
import { cleanTube } from '@renderer/lib/swatch-chart'
import { planImport } from './import-plan'
import { TubeStatus, sanitizeTubeList } from './paint-tube'

const STATUS = (t: { active: boolean; want: boolean }) =>
  t.active ? TubeStatus.Owned : t.want ? TubeStatus.Wanted : TubeStatus.Catalogue

const imported = original.importParsed.tubes.map((t) => {
  const r = cleanTube(t)
  if (!r.ok) throw new Error('fixture tube should be valid')
  return r.tube
})

describe('planImport', () => {
  it.each(original.imports)('with $opts', ({ opts, added, updated, removed, next }) => {
    const plan = planImport(sanitizeTubeList(original.tubes), imported, original.importParsed.groups, {
      markOwned: opts.activate,
      replaceGroups: opts.replace,
    })
    expect([plan.added, plan.updated, plan.removed]).toEqual([added, updated, removed])
    expect(plan.next).toHaveLength(next.length)
    plan.next.forEach((t, i) => {
      const e = next[i]!
      if (e.id !== '<new>') expect(t.id).toBe(e.id)
      expect([t.name, t.group, t.hex, t.status]).toEqual([e.name, e.group, e.hex, STATUS(e)])
    })
  })

  it('keeps the status of an updated tube and changes nothing in the current list', () => {
    const current = sanitizeTubeList(original.tubes)
    const before = JSON.stringify(current)
    const plan = planImport(current, imported, original.importParsed.groups, {
      markOwned: false,
      replaceGroups: false,
    })
    const lemon = plan.next.find((t) => t.name === 'Lemon')!
    expect(lemon.hex).toBe('#f2e03a')
    expect(lemon.status).toBe(TubeStatus.Owned)
    expect(JSON.stringify(current)).toBe(before)
  })
})
