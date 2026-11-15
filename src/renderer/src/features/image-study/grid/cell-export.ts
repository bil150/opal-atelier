/** Cells cut out of the reference image (true colours, no lines or labels): one PNG, or a ZIP of several. */
import { zipBytes, type ZipEntry } from '@renderer/lib/zip'
import { cellName } from './cell-refs'
import { cellRect, type GridGeometry } from './grid-settings'

/** Beyond this many cells, "Export all" is refused: fewer columns are needed. */
export const MAX_EXPORT_CELLS = 1500

export interface ExportedFile {
  readonly blob: Blob
  readonly fileName: string
  readonly mimeType: string
  readonly extension: string
}

/** Every cell of the grid, row by row. */
export function allCells(geometry: GridGeometry): (readonly [number, number])[] {
  const cells: (readonly [number, number])[] = []
  for (let r = 0; r < geometry.rows; r++) for (let c = 0; c < geometry.cols; c++) cells.push([c, r])
  return cells
}

export type CanvasEncoder = (canvas: HTMLCanvasElement) => Promise<Blob>

/**
 * PNG of each cell; one cell gives a PNG file, several a ZIP (`zipName` is the translated "cells").
 * `encode` turns a canvas into a PNG blob.
 */
export async function exportCells(
  source: HTMLCanvasElement,
  geometry: GridGeometry,
  cells: readonly (readonly [number, number])[],
  baseName: string,
  zipName: string,
  encode: CanvasEncoder,
): Promise<ExportedFile | null> {
  const entries: ZipEntry[] = []
  let firstPng: Blob | null = null
  for (const [c, r] of cells) {
    const rect = cellRect(geometry, c, r, source.width, source.height)
    const canvas = document.createElement('canvas')
    canvas.width = rect.w
    canvas.height = rect.h
    canvas.getContext('2d')?.drawImage(source, rect.x0, rect.y0, rect.w, rect.h, 0, 0, rect.w, rect.h)
    const blob = await encode(canvas)
    firstPng ??= blob
    entries.push({
      name: `${baseName}-${cellName(c, r)}.png`,
      data: new Uint8Array(await blob.arrayBuffer()),
    })
  }
  const [only] = entries
  if (!only || !firstPng) return null
  if (entries.length === 1)
    return {
      blob: firstPng,
      fileName: only.name,
      mimeType: 'image/png',
      extension: '.png',
    }
  return {
    blob: new Blob([zipBytes(entries)], { type: 'application/zip' }),
    fileName: `${baseName}-${zipName}.zip`,
    mimeType: 'application/zip',
    extension: '.zip',
  }
}
