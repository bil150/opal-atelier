/** Options shared by the studio tools (Image study, Colour, Mannequin). */
import { isPhone } from '@renderer/components/ui/panel-collapse'

/** Where the settings panels sit relative to the main view. */
export enum StudioLayout {
  Above = 'above',
  Below = 'below',
  Right = 'right',
  /** Panels hidden: the main view alone. */
  Focus = 'focus',
}

export const STUDIO_LAYOUTS: readonly StudioLayout[] = Object.values(StudioLayout)

/** Until the user picks one: settings on the right on large screens, below the main view on phones. */
export function defaultLayout(): StudioLayout {
  return isPhone() ? StudioLayout.Below : StudioLayout.Right
}
