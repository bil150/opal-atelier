/** Characterisation tests against the original page's ZIP writer (tests/fixtures/image-study.json). */
import { describe, expect, it } from 'vitest'
import original from '@tests/fixtures/image-study.json'
import { crc32, zipBytes } from './zip'

describe('crc32', () => {
  it.each(original.crc32)('crc32("$s")', ({ s, crc }) => {
    expect(crc32(new TextEncoder().encode(s))).toBe(crc)
  })
})

describe('zipBytes', () => {
  it('writes byte for byte the same archive as the original', () => {
    const entries = original.zip.files.map((f) => ({ name: f.name, data: new Uint8Array(f.data) }))
    expect([...zipBytes(entries, new Date(2026, 10, 15, 10, 30, 42))]).toEqual(original.zip.bytes)
  })

  it('writes an empty archive as just its end record', () => {
    const bytes = zipBytes([])
    expect(bytes).toHaveLength(22)
    expect([...bytes.slice(0, 4)]).toEqual([0x50, 0x4b, 0x05, 0x06])
  })
})
