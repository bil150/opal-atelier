import { afterEach, describe, expect, it, vi } from 'vitest'
import { copyText } from './clipboard'

const realClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard')

function setClipboard(writeText: (text: string) => Promise<void>) {
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
}

afterEach(() => {
  if (realClipboard) Object.defineProperty(navigator, 'clipboard', realClipboard)
  else Reflect.deleteProperty(navigator, 'clipboard')
})

describe('copyText', () => {
  it('uses the Clipboard API', async () => {
    const writeText = vi.fn(() => Promise.resolve())
    setClipboard(writeText)
    await expect(copyText('Blue')).resolves.toBe(true)
    expect(writeText).toHaveBeenCalledWith('Blue')
  })

  it('falls back to the old copy command, and says when that fails too', async () => {
    setClipboard(() => Promise.reject(new Error('denied')))
    Object.defineProperty(document, 'execCommand', { configurable: true, value: vi.fn(() => true) })
    await expect(copyText('Blue')).resolves.toBe(true)
    Object.defineProperty(document, 'execCommand', { configurable: true, value: vi.fn(() => false) })
    await expect(copyText('Blue')).resolves.toBe(false)
    expect(document.querySelector('textarea')).toBeNull()
  })
})
