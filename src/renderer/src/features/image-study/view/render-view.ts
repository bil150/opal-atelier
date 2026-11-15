/** The view as saved by "Export as PNG": what is seen (grid in Grid, greys in Values), without sight or selection. */
import type { GridSettings } from '../grid/grid-settings'
import { ImageStudySection } from '../image-study-settings'
import { drawGrid } from './draw-overlay'
import { greyVersion, type ReferenceImage } from './reference-image'

export function renderView(
  image: ReferenceImage,
  mode: ImageStudySection,
  grid: GridSettings,
): HTMLCanvasElement {
  const { width, height } = image.source
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas
  ctx.drawImage(mode === ImageStudySection.Values ? greyVersion(image) : image.source, 0, 0)
  if (mode === ImageStudySection.Grid)
    drawGrid(ctx, width, height, 1, { grid, selection: new Set(), showSelection: false })
  return canvas
}
