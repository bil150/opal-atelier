/** Options shared by the studio tools (Image study, Colour, Mannequin). */

/** Where the settings panels sit relative to the main view. */
export enum StudioLayout {
  /** Panels first: the default, so on a phone the settings aren't a long scroll away. */
  Above = 'above',
  Below = 'below',
  Right = 'right',
  /** Panels hidden: the main view alone. */
  Focus = 'focus',
}

export const STUDIO_LAYOUTS: readonly StudioLayout[] = Object.values(StudioLayout)
