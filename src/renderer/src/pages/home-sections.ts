import type en from '@renderer/i18n/locales/en.json'
import { AppRoute, ToolPath } from '@renderer/routes'

export type TileKey = keyof typeof en.home.tiles
export type SectionKey = keyof typeof en.home.sections

/** Pastel tile backgrounds, defined as --color-tile-* in index.css. */
export enum TileTone {
  Rose = 'rose',
  Peach = 'peach',
  Butter = 'butter',
  Mint = 'mint',
  Sky = 'sky',
  Lilac = 'lilac',
}

export interface HomeTile {
  readonly key: TileKey
  readonly emoji: string
  readonly path: AppRoute | ToolPath
  readonly tone: TileTone
}

export interface HomeSection {
  readonly key: SectionKey
  readonly tiles: readonly HomeTile[]
}

/** The home menu, as on the original site: one section per tool, one tile per entry point. */
export const HOME_SECTIONS: readonly HomeSection[] = [
  {
    key: 'imageStudy',
    tiles: [
      { key: 'grid', emoji: '🔲', path: ToolPath.ImageStudyGrid, tone: TileTone.Sky },
      { key: 'values', emoji: '🌗', path: ToolPath.ImageStudyValues, tone: TileTone.Lilac },
      { key: 'picker', emoji: '💧', path: ToolPath.ImageStudyPicker, tone: TileTone.Mint },
      { key: 'paints', emoji: '🎨', path: ToolPath.ImageStudyPaints, tone: TileTone.Butter },
    ],
  },
  {
    key: 'color',
    tiles: [
      { key: 'wheel', emoji: '🎡', path: ToolPath.ColorWheel, tone: TileTone.Mint },
      { key: 'mix', emoji: '🧪', path: ToolPath.ColorMix, tone: TileTone.Sky },
      { key: 'palette', emoji: '🎨', path: ToolPath.ColorPalette, tone: TileTone.Lilac },
      { key: 'temperature', emoji: '🌡️', path: ToolPath.ColorTemperature, tone: TileTone.Peach },
      { key: 'theory', emoji: '📖', path: ToolPath.ColorTheory, tone: TileTone.Butter },
    ],
  },
  {
    key: 'mannequin',
    tiles: [
      { key: 'poses', emoji: '🧍', path: ToolPath.MannequinPoses, tone: TileTone.Rose },
      { key: 'sketch', emoji: '⏱️', path: ToolPath.MannequinSketch, tone: TileTone.Peach },
      { key: 'light', emoji: '💡', path: ToolPath.MannequinLight, tone: TileTone.Butter },
    ],
  },
  {
    key: 'reference',
    tiles: [{ key: 'glossary', emoji: '📚', path: AppRoute.Glossary, tone: TileTone.Mint }],
  },
]
