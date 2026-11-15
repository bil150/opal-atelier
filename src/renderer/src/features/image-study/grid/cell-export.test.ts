import { describe, expect, it } from 'vitest'
import { crc32 } from '@renderer/lib/zip'
import { MAX_EXPORT_CELLS, allCells, exportCells, type CanvasEncoder } from './cell-export'
import { gridGeometry, sanitizeGrid } from './grid-settings'

function sourceCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}

/** Encodes each canvas as its size in text, so the archive content can be checked. */
const sizes: CanvasEncoder = (canvas) =>
  Promise.resolve(new Blob([`${canvas.width}x${canvas.height}`], { type: 'image/png' }))

const decode = (bytes: Uint8Array) => new TextDecoder().decode(bytes)

describe('allCells', () => {
  it('lists every cell row by row', () => {
    const geometry = gridGeometry(sanitizeGrid({ cols: 2, cell: 0.5 }), 100, 100)
    expect(allCells(geometry)).toEqual([
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ])
  })

  it('keeps the export limit of the original tool', () => {
    expect(MAX_EXPORT_CELLS).toBe(1500)
  })
})

describe('exportCells', () => {
  const source = sourceCanvas(100, 60)
  const geometry = gridGeometry(sanitizeGrid({ cols: 4, cell: 0.25 }), 100, 60)

  it('gives nothing for no cell', async () => {
    expect(await exportCells(source, geometry, [], 'portrait', 'cells', sizes)).toBeNull()
  })

  it('exports a single cell as a PNG named after it', async () => {
    const file = await exportCells(source, geometry, [[1, 0]], 'portrait', 'cells', sizes)
    expect(file).toMatchObject({ fileName: 'portrait-B1.png', mimeType: 'image/png', extension: '.png' })
    expect(await file?.blob.text()).toBe('25x25')
  })

  it('clips the last row to the image', async () => {
    const file = await exportCells(source, geometry, [[0, 2]], 'portrait', 'cells', sizes)
    expect(await file?.blob.text()).toBe('25x10')
  })

  it('zips several cells, in the given order', async () => {
    const file = await exportCells(
      source,
      geometry,
      [
        [0, 0],
        [3, 2],
      ],
      'portrait',
      'cells',
      sizes,
    )
    expect(file).toMatchObject({
      fileName: 'portrait-cells.zip',
      mimeType: 'application/zip',
      extension: '.zip',
    })
    const bytes = new Uint8Array(await file!.blob.arrayBuffer())
    const view = new DataView(bytes.buffer)
    expect(view.getUint32(0, true)).toBe(0x04034b50) // local file header
    const text = decode(bytes)
    expect(text).toContain('portrait-A1.png')
    expect(text).toContain('portrait-D3.png')
    expect(text.indexOf('portrait-A1.png')).toBeLessThan(text.indexOf('portrait-D3.png'))
    // first entry: stored as is, with its CRC
    const nameLength = view.getUint16(26, true)
    const size = view.getUint32(18, true)
    const data = bytes.slice(30 + nameLength, 30 + nameLength + size)
    expect(decode(data)).toBe('25x25')
    expect(view.getUint32(14, true)).toBe(crc32(data))
  })
})
