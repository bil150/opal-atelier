/** Sections and remembered settings of Image study. */
import {
  DEFAULT_CALCULATION_OPTIONS,
  type CalculationOptions,
} from '@renderer/features/paints/tube-classification'
import { field, isBoolean } from '@renderer/hooks/use-local-storage'

/** Sections reachable by URL (/image-study/:section). */
export enum ImageStudySection {
  Grid = 'grid',
  Values = 'values',
  Picker = 'picker',
  Paints = 'paints',
  Settings = 'settings',
}

/** Sections that show the reference image. */
export const IMAGE_SECTIONS: readonly ImageStudySection[] = [
  ImageStudySection.Grid,
  ImageStudySection.Values,
  ImageStudySection.Picker,
]

export function isImageStudySection(value: unknown): value is ImageStudySection {
  return (Object.values(ImageStudySection) as unknown[]).includes(value)
}

export const GRID_KEY = 'image-study:grid'
export const CALCULATION_KEY = 'image-study:calculation'
/** Every key of this tool (for "delete the data on this device"). */
export const IMAGE_STUDY_KEYS: readonly string[] = [GRID_KEY, CALCULATION_KEY]

export function sanitizeCalculation(raw: unknown): CalculationOptions {
  return {
    excludeBlacks: field(raw, 'excludeBlacks', isBoolean, DEFAULT_CALCULATION_OPTIONS.excludeBlacks),
    excludeEffects: field(raw, 'excludeEffects', isBoolean, DEFAULT_CALCULATION_OPTIONS.excludeEffects),
  }
}
