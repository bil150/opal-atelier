import { createContext, useSyncExternalStore } from 'react'

/** Set by the studio dashboard: on phones, its panels can be folded to their title. */
export const CollapsiblePanels = createContext(false)

/** Phones only: folding is a way to fit a small screen; on large screens every panel stays open. */
export const PHONE_QUERY = '(max-width: 640px)'

export function isPhone(): boolean {
  return typeof matchMedia === 'function' && matchMedia(PHONE_QUERY).matches
}

function subscribe(listener: () => void): () => void {
  if (typeof matchMedia !== 'function') return () => undefined
  const media = matchMedia(PHONE_QUERY)
  media.addEventListener('change', listener)
  return () => media.removeEventListener('change', listener)
}

/** Whether the screen is a phone's, following window resizes and rotations. */
export function usePhone(): boolean {
  return useSyncExternalStore(subscribe, isPhone)
}
