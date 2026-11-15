import { describe, expect, it } from 'vitest'
import { Lightfastness } from '@renderer/lib/swatch-chart'
import { MAX_TUBES, TubeStatus, sanitizePaintTube } from './paint-tube'
import { DraftError, draftOf, emptyDraft, listText, saveDraft, setStatus } from './tube-draft'

const blue = sanitizePaintTube({
  id: 'b',
  name: 'Blue',
  pigment: 'PB29',
  hex: '#1f3a93',
  group: 'My brand',
  status: 'owned',
})!

describe('tube drafts', () => {
  it('starts a new tube in the previous group', () => {
    expect(emptyDraft('My brand')).toMatchObject({
      name: '',
      group: 'My brand',
      status: TubeStatus.Owned,
      hex: '#808080',
    })
  })

  it('adds a cleaned-up tube', () => {
    const result = saveDraft(
      [],
      { ...emptyDraft(''), name: '  Lemon   yellow ', pigment: 'py3', hex: '#ABC', group: ' Mine ' },
      null,
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.tubes[0]).toMatchObject({
      name: 'Lemon yellow',
      pigment: 'PY3',
      hex: '#aabbcc',
      group: 'Mine',
    })
    expect(result.group).toBe('Mine')
  })

  it('updates the tube being edited, keeping its id', () => {
    const result = saveDraft(
      [blue],
      { ...draftOf(blue), lightfastness: Lightfastness.VeryGood, status: TubeStatus.Wanted },
      'b',
    )
    expect(result.ok && result.tubes).toEqual([
      { ...blue, lightfastness: Lightfastness.VeryGood, status: TubeStatus.Wanted },
    ])
  })

  it('refuses a tube without name or valid colour, or beyond the limit', () => {
    expect(saveDraft([], emptyDraft(''), null)).toEqual({ ok: false, error: DraftError.MissingName })
    expect(saveDraft([], { ...emptyDraft(''), name: 'X', hex: 'blue' }, null)).toEqual({
      ok: false,
      error: DraftError.InvalidColour,
    })
    const full = Array.from({ length: MAX_TUBES }, (_, i) => ({ ...blue, id: `t${i}` }))
    expect(saveDraft(full, { ...emptyDraft(''), name: 'One more' }, null)).toEqual({
      ok: false,
      error: DraftError.TooManyTubes,
    })
  })

  it('changes the status of several tubes at once', () => {
    const red = { ...blue, id: 'r', name: 'Red' }
    expect(setStatus([blue, red], new Set(['r']), TubeStatus.Wanted).map((t) => t.status)).toEqual([
      TubeStatus.Owned,
      TubeStatus.Wanted,
    ])
  })

  it('copies a list with group, pigment and colour', () => {
    expect(listText('To buy', [blue, { ...blue, id: 'x', name: 'Loose', group: '', pigment: '' }])).toBe(
      'To buy (2)\nMy brand · Blue (PB29) · #1F3A93\nLoose · #1F3A93',
    )
  })
})
