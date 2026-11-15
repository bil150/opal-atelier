/** Hash-router paths of the app. */
export enum AppRoute {
  Home = '/',
  Glossary = '/glossary',
  ImageStudy = '/image-study',
  Color = '/color',
  Mannequin = '/mannequin',
  Settings = '/settings',
}

/** Deep links into a tool's section, e.g. from the home page or the glossary. */
export enum ToolPath {
  ImageStudyGrid = '/image-study/grid',
  ImageStudyValues = '/image-study/values',
  ImageStudyPicker = '/image-study/picker',
  ImageStudyPaints = '/image-study/paints',
  ImageStudySettings = '/image-study/settings',
  ColorWheel = '/color/wheel',
  ColorMix = '/color/mix',
  ColorPalette = '/color/palette',
  ColorTemperature = '/color/temperature',
  ColorTheory = '/color/theory',
  MannequinPoses = '/mannequin/poses',
  MannequinSketch = '/mannequin/sketch',
  MannequinLight = '/mannequin/light',
}

export function glossaryTermPath(termId: string): string {
  return `${AppRoute.Glossary}/${encodeURIComponent(termId)}`
}
