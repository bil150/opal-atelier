/**
 * Page theme ("backdrop"), on every page: Neutral (white, the default), Opal (the site's own), or a theme with no hue. "Neutral grey" and
 * "Contrast" have no hue at all, so the interface never sways the perception of the colours being judged.
 * Independent of light / dark: each theme has both.
 */
import { useSyncExternalStore } from 'react'
import { isOneOf, readStored, writeStored } from '@renderer/hooks/use-local-storage'

export enum Backdrop {
  /** White, the default: the app's plain colours. */
  Neutral = 'neutral',
  Grey = 'grey',
  Paper = 'paper',
  Contrast = 'contrast',
  /** Pearly, iridescent: the site's own theme, after the opal. */
  Opal = 'opal',
}

export const BACKDROPS: readonly Backdrop[] = Object.values(Backdrop)

/** Kept from when the theme was a studio option, so the choice already made is not lost. */
export const BACKDROP_KEY = 'studio:backdrop'

/** Background and ink of each theme's swatch. */
export const BACKDROP_SWATCH: Readonly<Record<Backdrop, readonly [paper: string, ink: string]>> = {
  [Backdrop.Neutral]: ['#E8ECF4', '#14213D'],
  [Backdrop.Grey]: ['#D2D2D2', '#6A6A6A'],
  [Backdrop.Paper]: ['#EADFC8', '#8A6D45'],
  [Backdrop.Contrast]: ['#FFFFFF', '#000000'],
  [Backdrop.Opal]: ['#F1EAFF', '#7E6CC8'],
}

const listeners = new Set<() => void>()
let current: Backdrop | null = null

export function readBackdrop(): Backdrop {
  current ??= readStored(BACKDROP_KEY, Backdrop.Neutral, isOneOf(BACKDROPS))
  return current
}

/** Sets `data-backdrop` on <html> (none for Neutral, the default); CSS swaps the colour tokens. */
export function applyBackdrop(backdrop: Backdrop): void {
  const root = document.documentElement
  if (backdrop === Backdrop.Neutral) delete root.dataset.backdrop
  else root.dataset.backdrop = backdrop
}

export function setBackdrop(backdrop: Backdrop): void {
  current = backdrop
  writeStored(BACKDROP_KEY, backdrop)
  applyBackdrop(backdrop)
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** The current theme; every picker on the page stays in step. */
export function useBackdrop(): Backdrop {
  return useSyncExternalStore(subscribe, readBackdrop)
}

/** For tests: forget the cached choice so the next read comes from storage. */
export function resetBackdropForTests(): void {
  current = null
  delete document.documentElement.dataset.backdrop
}
