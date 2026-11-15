/**
 * The user's tubes, shared by Image study and the Colour tool. Kept in localStorage; changes in another
 * tab are picked up. On first use, tubes entered on the original site (same origin on GitHub Pages)
 * are copied over; the original entry is left untouched.
 */
import { useSyncExternalStore } from 'react'
import { STORAGE_PREFIX } from '@renderer/hooks/use-local-storage'
import { sanitizeTubeList, toStoredTube, type PaintTube } from './paint-tube'

export const TUBES_KEY = `${STORAGE_PREFIX}tubes`
/** Original site's storage key (its name dates from an earlier version of the tool). */
export const LEGACY_TUBES_KEY = 'tools:arts:melangeur:atelier'
const STORAGE_VERSION = 2

type Listener = () => void

export interface TubeStoreSnapshot {
  readonly tubes: readonly PaintTube[]
  /** False when the browser refuses to store data (private mode, blocked storage). */
  readonly storageOk: boolean
}

function readList(key: string): PaintTube[] | null {
  const raw = localStorage.getItem(key)
  if (raw === null) return null
  const data = JSON.parse(raw) as { tubes?: unknown } | null
  return sanitizeTubeList(data?.tubes)
}

export class TubeStore {
  readonly #listeners = new Set<Listener>()
  #snapshot: TubeStoreSnapshot

  constructor() {
    this.#snapshot = this.#load()
    addEventListener('storage', (e) => {
      if (e.key === TUBES_KEY || e.key === null) {
        this.#snapshot = this.#load()
        this.#emit()
      }
    })
  }

  readonly subscribe = (listener: Listener): (() => void) => {
    this.#listeners.add(listener)
    return () => this.#listeners.delete(listener)
  }

  readonly getSnapshot = (): TubeStoreSnapshot => this.#snapshot

  /** Replaces the tubes (from an updater, so concurrent edits compose) and saves them. */
  readonly update = (updater: (tubes: readonly PaintTube[]) => readonly PaintTube[]): void => {
    const tubes = updater(this.#snapshot.tubes)
    let storageOk = true
    try {
      localStorage.setItem(TUBES_KEY, JSON.stringify({ v: STORAGE_VERSION, tubes: tubes.map(toStoredTube) }))
    } catch {
      storageOk = false
    }
    this.#snapshot = { tubes, storageOk }
    this.#emit()
  }

  /** Re-reads storage (after the user wiped this app's data). */
  readonly reload = (): void => {
    this.#snapshot = this.#load()
    this.#emit()
  }

  #load(): TubeStoreSnapshot {
    try {
      const current = readList(TUBES_KEY)
      if (current) return { tubes: current, storageOk: true }
      const legacy = readList(LEGACY_TUBES_KEY)
      if (legacy?.length) {
        localStorage.setItem(
          TUBES_KEY,
          JSON.stringify({ v: STORAGE_VERSION, tubes: legacy.map(toStoredTube) }),
        )
        return { tubes: legacy, storageOk: true }
      }
      return { tubes: [], storageOk: true }
    } catch {
      return { tubes: [], storageOk: false }
    }
  }

  #emit(): void {
    for (const listener of this.#listeners) listener()
  }
}

let store: TubeStore | null = null

export function getTubeStore(): TubeStore {
  store ??= new TubeStore()
  return store
}

/** Live list of the user's tubes. */
export function useTubes(): TubeStoreSnapshot {
  const s = getTubeStore()
  return useSyncExternalStore(s.subscribe, s.getSnapshot)
}

/** For tests: forget the singleton so the next use reads storage again. */
export function resetTubeStoreForTests(): void {
  store = null
}
