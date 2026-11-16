import { isOneOf, useLocalStorage } from '@renderer/hooks/use-local-storage'
import { STUDIO_LAYOUTS, defaultLayout, type StudioLayout } from './studio-options'

/** One layout for every studio tool: chosen in one, found again in the others. */
export const STUDIO_LAYOUT_KEY = 'studio:layout'

/** Where the settings panels sit, shared by Image study, Colour and Mannequin. */
export function useStudioLayout(): readonly [StudioLayout, (layout: StudioLayout) => void] {
  return useLocalStorage(STUDIO_LAYOUT_KEY, defaultLayout(), isOneOf(STUDIO_LAYOUTS))
}
