import { describe, expect, it } from 'vitest'
import { exportBaseName, fitSize, isImageFile, isPdfFile, loadImageFile, slugify } from './image-file'

describe('image files', () => {
  it('recognises images and PDFs', () => {
    expect(isImageFile(new File([''], 'a.png', { type: 'image/png' }))).toBe(true)
    expect(isPdfFile(new File([''], 'chart.PDF'))).toBe(true)
    expect(isPdfFile(new File([''], 'x', { type: 'application/pdf' }))).toBe(true)
    expect(isImageFile(new File([''], 'notes.txt', { type: 'text/plain' }))).toBe(false)
  })

  it('refuses a file that is not an image', async () => {
    await expect(loadImageFile(new File(['x'], 'notes.txt', { type: 'text/plain' }))).rejects.toThrow(
      'not-an-image',
    )
  })

  it('reduces the longest side, never enlarges', () => {
    expect(fitSize(3200, 1600, 1600)).toEqual({ width: 1600, height: 800 })
    expect(fitSize(1000, 4000, 1600)).toEqual({ width: 400, height: 1600 })
    expect(fitSize(800, 600, 1600)).toEqual({ width: 800, height: 600 })
  })

  it('makes safe export names', () => {
    expect(exportBaseName('My photo (1).jpg')).toBe('My-photo-1')
    expect(exportBaseName('.png')).toBe('image')
    expect(exportBaseName(`${'a'.repeat(80)}.png`)).toHaveLength(60)
    expect(slugify('Été d’or', 'x')).toBe('ete-d-or')
    expect(slugify('***', 'chart')).toBe('chart')
  })
})
