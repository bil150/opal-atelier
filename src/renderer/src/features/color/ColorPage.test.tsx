import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Locale } from '@renderer/i18n/locale'
import { renderApp } from '@tests/helpers/render-app'

const storedJson = (key: string): unknown => JSON.parse(localStorage.getItem(`opal:${key}`) ?? 'null')

describe('Colour tool', () => {
  it('opens on the wheel, with the tabs of the original page', async () => {
    await renderApp('/color', Locale.English)
    const tabs = screen.getAllByRole('tab').map((t) => t.getAttribute('aria-label'))
    expect(tabs).toEqual(['Colour wheel', 'Mixing simulator', 'Temperature and neutrals', 'Colour theory'])
    expect(screen.getByRole('tab', { name: 'Colour wheel' })).toHaveAttribute('aria-selected', 'true')
    expect(
      screen.getByRole('img', { name: /^Colour wheel, complementary: Yellow, Violet/ }),
    ).toBeInTheDocument()
  })

  it('rotates the harmony with the keyboard and remembers it', async () => {
    await renderApp('/color/wheel', Locale.English)
    const wheel = screen.getByRole('img', { name: /^Colour wheel/ })
    wheel.focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(wheel).toHaveAccessibleName(/complementary: Yellow-orange, Blue-violet/)
    expect(storedJson('color:wheel')).toMatchObject({ base: 30 })
  })

  it('changes harmony and lists its colours with their rank', async () => {
    await renderApp('/color/wheel', Locale.French)
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Harmonie' }), 'triade')
    expect(screen.getAllByText('primaire')).toHaveLength(3)
    expect(screen.getByText('Rouge', { selector: 'b' })).toBeInTheDocument()
  })

  it('switches tabs from the keyboard and updates the address', async () => {
    await renderApp('/color', Locale.English)
    screen.getByRole('tab', { name: 'Colour wheel' }).focus()
    await userEvent.keyboard('{ArrowDown}')
    expect(screen.getByRole('tab', { name: 'Mixing simulator' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('img', { name: /^Mix result, 1 : 1 : 1/ })).toBeInTheDocument()
  })

  describe('mixing simulator', () => {
    it('doses a mix with the part steppers', async () => {
      await renderApp('/color/mix', Locale.English)
      await userEvent.click(screen.getByRole('button', { name: 'One part more of Primary cyan' }))
      expect(screen.getByRole('img', { name: 'Mix result, 2 : 1 : 1' })).toBeInTheDocument()
      expect(storedJson('color:mix')).toMatchObject({ parts: [2, 1, 1] })
    })

    it('picks a colour by searching, without accents', async () => {
      await renderApp('/color/mix', Locale.French)
      await userEvent.click(screen.getByRole('button', { name: 'Couleur 1 : Cyan primaire. Changer' }))
      const dialog = screen.getByRole('dialog', { name: 'Choisir une couleur' })
      await userEvent.type(within(dialog).getByRole('searchbox'), 'ceruleen{Enter}')
      expect(screen.queryByRole('dialog')).toBeNull()
      expect(screen.getByRole('button', { name: 'Couleur 1 : Bleu céruléen. Changer' })).toHaveFocus()
    })

    it('shows what a limited palette reaches, from its own address', async () => {
      await renderApp('/color/palette', Locale.English)
      expect(screen.getByRole('button', { name: /Whole palette/ })).toHaveAttribute('aria-pressed', 'true')
      expect(
        screen.getByRole('img', {
          name: 'Mixing chart of Primary cyan, Primary magenta, Primary yellow and white',
        }),
      ).toBeInTheDocument()
      expect(screen.getByText(/^Clear hues:/)).toBeInTheDocument()

      await userEvent.click(screen.getByRole('button', { name: 'One colour more' }))
      expect(screen.getByText('4 colours')).toBeInTheDocument()
    })
  })

  it('lets the address decide the simulator mode, and the tab reopen the last one', async () => {
    const { unmount } = await renderApp('/color/palette', Locale.English)
    unmount()
    await renderApp('/color/mix', Locale.English)
    expect(screen.getByRole('button', { name: /One mix/ })).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(screen.getByRole('button', { name: /Whole palette/ }))
    await userEvent.click(screen.getByRole('tab', { name: 'Colour wheel' }))
    await userEvent.click(screen.getByRole('tab', { name: 'Mixing simulator' }))
    expect(screen.getByRole('button', { name: /Whole palette/ })).toHaveAttribute('aria-pressed', 'true')
  })

  it('tells how to warm a colour, with a simple recipe', async () => {
    await renderApp('/color/temperature', Locale.English)
    expect(
      screen.getByText(/^To warm it: add \d+ parts? of .+ to \d+ parts? of your colour\.$/),
    ).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Grey down/ }))
    expect(screen.getByText(/^To grey it: add/)).toBeInTheDocument()
  })

  it('shows the theory cards and the seven contrasts', async () => {
    await renderApp('/color/theory', Locale.French)
    expect(screen.getByRole('heading', { name: 'Le dilemme des complémentaires' })).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(7)
  })

  it('puts the settings on the right by default on a large screen, and remembers another layout', async () => {
    await renderApp('/color/wheel', Locale.English)
    const layouts = screen.getByRole('group', { name: 'Layout' })
    expect(within(layouts).getByRole('button', { name: 'Settings on the right' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    const stage = screen.getByRole('region', { name: /wheel/i })
    await userEvent.click(within(layouts).getByRole('button', { name: 'Settings above' }))
    expect(localStorage.getItem('opal:studio:layout')).toBe('"above"')
    expect(stage.nextElementSibling?.className).toContain('order-first')
  })

  it('shares the layout with Image study and Mannequin', async () => {
    const { unmount } = await renderApp('/color/wheel', Locale.English)
    await userEvent.click(
      within(screen.getByRole('group', { name: 'Layout' })).getByRole('button', { name: 'Settings below' }),
    )
    unmount()
    for (const path of ['/image-study/grid', '/mannequin/poses']) {
      const view = await renderApp(path, Locale.English)
      expect(
        within(screen.getByRole('group', { name: 'Layout' })).getByRole('button', { name: 'Settings below' }),
      ).toHaveAttribute('aria-pressed', 'true')
      view.unmount()
    }
  })

  it('puts the settings below the main view by default on a phone', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('max-width'),
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }))
    await renderApp('/color/wheel', Locale.English)
    const layouts = screen.getByRole('group', { name: 'Layout' })
    expect(within(layouts).getByRole('button', { name: 'Settings below' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    vi.unstubAllGlobals()
  })

  it('marks the page as a studio tool while it is open (neutral hover)', async () => {
    const { unmount } = await renderApp('/color', Locale.English)
    expect(document.documentElement.dataset.studio).toBe('')
    unmount()
    expect(document.documentElement.dataset.studio).toBeUndefined()
  })
})
