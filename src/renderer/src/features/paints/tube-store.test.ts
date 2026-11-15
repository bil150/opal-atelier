import { afterEach, describe, expect, it, vi } from 'vitest'
import { TubeStatus, sanitizePaintTube } from './paint-tube'
import { LEGACY_TUBES_KEY, TUBES_KEY, TubeStore } from './tube-store'

const tube = (name: string, status = TubeStatus.Owned) =>
  sanitizePaintTube({ id: name.toLowerCase(), name, hex: '#123456', status })!

afterEach(() => localStorage.clear())

describe('TubeStore', () => {
  it('starts empty', () => {
    expect(new TubeStore().getSnapshot()).toEqual({ tubes: [], storageOk: true })
  })

  it('copies the original site’s tubes on first use, leaving them in place', () => {
    const legacy = JSON.stringify({
      v: 1,
      tubes: [{ id: 'a', name: 'Lemon', hex: '#f3e23b', active: false, want: true }],
    })
    localStorage.setItem(LEGACY_TUBES_KEY, legacy)
    const tubes = new TubeStore().getSnapshot().tubes
    expect(tubes.map((t) => [t.id, t.name, t.status])).toEqual([['a', 'Lemon', TubeStatus.Wanted]])
    expect(localStorage.getItem(LEGACY_TUBES_KEY)).toBe(legacy)
    expect(JSON.parse(localStorage.getItem(TUBES_KEY)!)).toMatchObject({
      v: 2,
      tubes: [{ id: 'a', status: 'wanted' }],
    })
  })

  it('prefers its own tubes over the original site’s', () => {
    localStorage.setItem(LEGACY_TUBES_KEY, JSON.stringify({ tubes: [{ name: 'Old', hex: '#000000' }] }))
    localStorage.setItem(TUBES_KEY, JSON.stringify({ v: 2, tubes: [] }))
    expect(new TubeStore().getSnapshot().tubes).toEqual([])
  })

  it('saves changes and notifies subscribers', () => {
    const store = new TubeStore()
    let calls = 0
    store.subscribe(() => calls++)
    store.update((tubes) => [...tubes, tube('Blue')])
    expect(calls).toBe(1)
    expect(new TubeStore().getSnapshot().tubes.map((t) => t.name)).toEqual(['Blue'])
  })

  it('picks up changes made in another tab', () => {
    const store = new TubeStore()
    localStorage.setItem(
      TUBES_KEY,
      JSON.stringify({ v: 2, tubes: [{ id: 'r', name: 'Red', hex: '#ff0000', status: 'owned' }] }),
    )
    dispatchEvent(new StorageEvent('storage', { key: TUBES_KEY }))
    expect(store.getSnapshot().tubes.map((t) => t.name)).toEqual(['Red'])
  })

  it('reports a storage that refuses data', () => {
    const store = new TubeStore()
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError')
    })
    store.update(() => [tube('Blue')])
    expect(store.getSnapshot()).toMatchObject({ storageOk: false, tubes: [{ name: 'Blue' }] })
  })
})
