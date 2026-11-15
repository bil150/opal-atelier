import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SaveOutcome, saveFile, type SaveFileOptions } from './save-file'

const options: SaveFileOptions = {
  suggestedName: 'swatch-chart.json',
  mimeType: 'application/json',
  extensions: ['.json'],
  description: 'Swatch chart',
}
const blob = new Blob(['{"tubes":[]}'], { type: 'application/json' })

function withPicker(picker: unknown): Window {
  return { showSaveFilePicker: picker, document } as unknown as Window
}

describe('saveFile with the native "Save as" dialog', () => {
  it('writes the blob to the chosen file', async () => {
    const writable = { write: vi.fn(), close: vi.fn() }
    const picker = vi.fn().mockResolvedValue({ createWritable: () => Promise.resolve(writable) })

    await expect(saveFile(blob, options, withPicker(picker))).resolves.toBe(SaveOutcome.Saved)

    expect(picker).toHaveBeenCalledWith({
      suggestedName: 'swatch-chart.json',
      types: [{ description: 'Swatch chart', accept: { 'application/json': ['.json'] } }],
    })
    expect(writable.write).toHaveBeenCalledWith(blob)
    expect(writable.close).toHaveBeenCalled()
  })

  it('treats closing the dialog as a cancellation', async () => {
    const picker = vi.fn().mockRejectedValue(new DOMException('The user aborted a request.', 'AbortError'))
    await expect(saveFile(blob, options, withPicker(picker))).resolves.toBe(SaveOutcome.Cancelled)
  })

  it('lets real errors through', async () => {
    const picker = vi.fn().mockRejectedValue(new DOMException('Disk full', 'QuotaExceededError'))
    await expect(saveFile(blob, options, withPicker(picker))).rejects.toThrow('Disk full')
  })
})

describe('saveFile as a download', () => {
  const revokeObjectURL = vi.fn()

  beforeEach(() => {
    vi.useFakeTimers()
    URL.createObjectURL = vi.fn(() => 'blob:opal/1')
    URL.revokeObjectURL = revokeObjectURL
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('clicks a temporary download link, then releases the blob', async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      expect(this.download).toBe('swatch-chart.json')
      expect(this.href).toBe('blob:opal/1')
    })

    await expect(saveFile(blob, options, window)).resolves.toBe(SaveOutcome.Saved)

    expect(click).toHaveBeenCalledOnce()
    expect(document.querySelector('a')).toBeNull()
    expect(revokeObjectURL).not.toHaveBeenCalled()
    vi.runAllTimers()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:opal/1')
  })
})
