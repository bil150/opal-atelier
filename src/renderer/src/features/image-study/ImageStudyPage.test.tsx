import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetTubeStoreForTests } from '@renderer/features/paints/tube-store'
import { Locale } from '@renderer/i18n/locale'
import { fakeImage, installFakeCanvas } from '@tests/helpers/fake-canvas'
import { renderApp } from '@tests/helpers/render-app'
import type * as ImageFile from './view/image-file'

vi.mock('./view/image-file', async (importOriginal) => ({
  ...(await importOriginal<typeof ImageFile>()),
  loadImageFile: vi.fn(() => Promise.resolve(fakeImage(400, 200))),
}))

const stored = (key: string): unknown => JSON.parse(localStorage.getItem(`opal:${key}`) ?? 'null')

const storeTubes = (tubes: object[]) => localStorage.setItem('opal:tubes', JSON.stringify({ v: 2, tubes }))

const PALETTE = [
  { id: 'w', name: 'Titanium white', hex: '#f4f2ec', status: 'owned' },
  { id: 'b', name: 'Ultramarine', hex: '#23308c', status: 'owned' },
  { id: 'y', name: 'Lemon yellow', hex: '#f3e33a', status: 'owned' },
  { id: 'r', name: 'Crimson', hex: '#a3122e', status: 'catalogue', group: 'Mine' },
]

async function loadPicture() {
  await userEvent.upload(
    screen.getByLabelText('Choose an image'),
    new File(['x'], 'photo.png', { type: 'image/png' }),
  )
  await screen.findByText('photo.png — 400 × 200 px')
}

let restoreCanvas: () => void

beforeEach(() => {
  resetTubeStoreForTests()
  restoreCanvas = installFakeCanvas({ r: 110, g: 139, b: 61 })
})

afterEach(() => {
  restoreCanvas()
  vi.restoreAllMocks()
})

describe('Image study', () => {
  it('opens on the grid, with the sections of the original page', async () => {
    await renderApp('/image-study', Locale.English)
    const tabs = screen.getAllByRole('tab').map((t) => t.getAttribute('aria-label'))
    expect(tabs).toEqual([
      'Grid',
      'Seeing values',
      'Preview and picker',
      'Physical colours – Paint',
      'Configuration',
    ])
    expect(screen.getByRole('tab', { name: 'Grid' })).toHaveAttribute('aria-selected', 'true')
    for (const title of ['Grid', 'Line', 'Cells', 'Navigation'])
      expect(screen.getByRole('heading', { name: title })).toBeInTheDocument()
    expect(screen.getByText('Drop an image')).toBeInTheDocument()
  })

  it('opens a section from its address, in French too', async () => {
    await renderApp('/image-study/values', Locale.French)
    expect(screen.getByRole('tab', { name: 'Perception des valeurs' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })

  it('hides the layout choice where there is no image', async () => {
    await renderApp('/image-study/grid', Locale.English)
    expect(screen.getByRole('group', { name: 'Layout' })).toBeVisible()
    await userEvent.click(screen.getByRole('tab', { name: 'Configuration' }))
    expect(screen.queryByRole('group', { name: 'Layout' })).toBeNull()
  })

  describe('grid', () => {
    it('loads an image and counts its rows', async () => {
      await renderApp('/image-study/grid', Locale.English)
      await loadPicture()
      expect(screen.getByText('columns × 2 rows')).toBeInTheDocument()
      expect(screen.getByText('No cell selected out of 8')).toBeInTheDocument()
    })

    it('refuses a file that is not an image', async () => {
      await renderApp('/image-study/grid', Locale.English)
      await userEvent.upload(
        screen.getByLabelText('Choose an image'),
        new File(['x'], 'notes.txt', { type: 'text/plain' }),
        { applyAccept: false },
      )
      expect(await screen.findByRole('alert')).toHaveTextContent('This file is not an image.')
    })

    it('remembers the number of columns typed', async () => {
      await renderApp('/image-study/grid', Locale.English)
      const columns = screen.getByRole('textbox', { name: 'Columns' })
      await userEvent.clear(columns)
      await userEvent.type(columns, '6{Enter}')
      expect(stored('image-study:grid')).toMatchObject({ cols: 6 })
      await userEvent.click(screen.getByRole('button', { name: 'More columns' }))
      expect(columns).toHaveValue('7')
    })

    it('selects cells by reference and explains unknown ones', async () => {
      await renderApp('/image-study/grid', Locale.English)
      await loadPicture()
      const refs = screen.getByRole('textbox', { name: 'Selected cells' })
      await userEvent.type(refs, 'a1, B2{Enter}')
      expect(screen.getByText('2 cells selected out of 8')).toBeInTheDocument()
      expect(refs).toHaveValue('A1, B2')
      await userEvent.clear(refs)
      await userEvent.type(refs, 'Z9{Enter}')
      expect(screen.getByText('Unknown reference: Z9')).toBeInTheDocument()
      await userEvent.keyboard('{Escape}')
      await userEvent.click(screen.getByRole('button', { name: 'Clear' }))
      expect(screen.getByText('No cell selected out of 8')).toBeInTheDocument()
    })
  })

  describe('picker', () => {
    it('asks for a colour, then for tubes, and leads to the paints', async () => {
      await renderApp('/image-study/picker', Locale.English)
      expect(screen.getByText('Pick a colour.')).toBeInTheDocument()
      await loadPicture()
      screen.getByLabelText('Reference image', { selector: 'canvas' }).focus()
      await userEvent.keyboard('{ArrowRight}')
      expect(screen.getByText('Add some tubes.')).toBeInTheDocument()
      await userEvent.click(screen.getByRole('button', { name: 'Open Physical colours' }))
      expect(screen.getByRole('tab', { name: 'Physical colours – Paint' })).toHaveAttribute(
        'aria-selected',
        'true',
      )
    })

    it('reads the picked colour and gives a recipe from the ticked tubes', async () => {
      storeTubes(PALETTE)
      await renderApp('/image-study/picker', Locale.English)
      await loadPicture()
      screen.getByLabelText('Reference image', { selector: 'canvas' }).focus()
      await userEvent.keyboard('{ArrowRight}')
      const target = screen.getByRole('heading', { name: 'Target colour' }).parentElement!
      expect(within(target).getByText('#6E8B3D')).toBeInTheDocument()
      expect(within(target).getByText('201, 100')).toBeInTheDocument()
      const recipe = screen.getByRole('heading', { name: 'Recipe' }).parentElement!
      expect(within(recipe).getByText(/^ΔE \d/)).toBeInTheDocument()
      expect(within(recipe).queryByText('Crimson')).toBeNull() // not ticked: never in the recipe
      await userEvent.click(within(recipe).getByRole('button', { name: 'Edit the mix' }))
      expect(within(recipe).getByRole('button', { name: 'Done' })).toHaveAttribute('aria-expanded', 'true')
    })
  })

  describe('paints for this image', () => {
    it('lists the owned paints used and the ones worth buying', async () => {
      storeTubes(PALETTE)
      await renderApp('/image-study/picker', Locale.English)
      await loadPicture()
      await userEvent.click(screen.getByRole('button', { name: 'Paints for this image' }))
      const dialog = screen.getByRole('dialog', { name: 'Paints for this image' })
      expect(within(dialog).getByRole('checkbox', { name: 'Mine' })).toBeChecked()
      expect(await within(dialog).findByRole('group', { name: 'Proposals' })).toBeInTheDocument()
      expect(within(dialog).getByRole('heading', { name: /^I have them\s*\d+$/ })).toBeInTheDocument()
      expect(
        within(dialog).getByText(/colours of the image taken into account \(32 colours\)/),
      ).toBeInTheDocument()
      await userEvent.click(within(dialog).getByRole('checkbox', { name: 'Mine' }))
      expect(within(dialog).queryByText('Crimson')).toBeNull()
    })
  })

  describe('recipe edits', () => {
    it('changes parts by hand, then restores the computed mix', async () => {
      storeTubes(PALETTE)
      await renderApp('/image-study/picker', Locale.English)
      await loadPicture()
      screen.getByLabelText('Reference image', { selector: 'canvas' }).focus()
      await userEvent.keyboard('{ArrowRight}')
      const recipe = screen.getByRole('heading', { name: 'Recipe' }).parentElement!
      await userEvent.click(within(recipe).getByRole('button', { name: 'Edit the mix' }))
      const [first] = within(recipe).getAllByRole('spinbutton')
      await userEvent.click(within(recipe).getAllByRole('button', { name: 'More parts' })[0]!)
      expect(within(recipe).getByText(/^Edited/)).toBeInTheDocument()
      expect(first).toBeInTheDocument()
      await userEvent.click(within(recipe).getByRole('button', { name: 'Restore' }))
      expect(within(recipe).queryByText(/^Edited/)).toBeNull()
    })
  })

  describe('paints', () => {
    it('adds a tube and keeps it', async () => {
      await renderApp('/image-study/paints', Locale.English)
      expect(screen.getByText('No tube yet.')).toBeInTheDocument()
      await userEvent.click(screen.getByRole('button', { name: 'Add a tube' }))
      await userEvent.type(screen.getByLabelText('Name'), 'Cobalt blue')
      await userEvent.click(screen.getByRole('button', { name: 'Add the tube' }))
      expect(screen.getByText('Cobalt blue')).toBeInTheDocument()
      expect(stored('tubes')).toMatchObject({ tubes: [{ name: 'Cobalt blue' }] })
    })
  })

  describe('settings', () => {
    it('remembers the calculation options', async () => {
      await renderApp('/image-study/settings', Locale.English)
      const blacks = screen.getByRole('checkbox', { name: 'No black tubes (chromatic blacks only)' })
      expect(blacks).toBeChecked()
      await userEvent.click(blacks)
      expect(stored('image-study:calculation')).toEqual({ excludeBlacks: false, excludeEffects: true })
    })

    it('restores tubes from a backup, after confirmation when some exist', async () => {
      storeTubes(PALETTE.slice(0, 1))
      const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
      await renderApp('/image-study/settings', Locale.English)
      const backup = JSON.stringify({ app: 'etude-image', tubes: PALETTE.slice(1), grille: { cols: 9 } })
      await userEvent.upload(
        screen.getByLabelText('Import tubes (JSON)'),
        new File([backup], 'backup.json', { type: 'application/json' }),
      )
      expect(await screen.findByText('3 tubes imported.')).toBeInTheDocument()
      expect(confirm).toHaveBeenCalledWith('Replace the 1 current tubes with the 3 from the file?')
      expect(stored('tubes')).toMatchObject({ tubes: [{ id: 'b' }, { id: 'y' }, { id: 'r' }] })
      await waitFor(() => expect(stored('image-study:grid')).toMatchObject({ cols: 9 }))
    })

    it('explains why a backup is refused', async () => {
      await renderApp('/image-study/settings', Locale.English)
      await userEvent.upload(
        screen.getByLabelText('Import tubes (JSON)'),
        new File(['{oops'], 'backup.json', { type: 'application/json' }),
      )
      expect(await screen.findByRole('alert')).toHaveTextContent('This file isn’t valid JSON.')
    })

    it('deletes this tool’s data once confirmed', async () => {
      storeTubes(PALETTE)
      localStorage.setItem('opal:image-study:grid', JSON.stringify({ cols: 12 }))
      localStorage.setItem('opal:color:wheel', JSON.stringify({ base: 30 }))
      const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true)
      await renderApp('/image-study/settings', Locale.English)
      const wipe = screen.getByRole('button', { name: 'Delete the data on this device' })
      await userEvent.click(wipe)
      expect(stored('tubes')).toMatchObject({ tubes: PALETTE.map(({ id }) => ({ id })) })
      await userEvent.click(wipe)
      expect(confirm).toHaveBeenCalledTimes(2)
      expect(screen.getByText('Data deleted on this device.')).toBeInTheDocument()
      expect(stored('tubes')).toMatchObject({ tubes: [] })
      expect(stored('image-study:grid')).toMatchObject({ cols: 4 })
      expect(stored('color:wheel')).toEqual({ base: 30 }) // other tools keep theirs
    })
  })
})
