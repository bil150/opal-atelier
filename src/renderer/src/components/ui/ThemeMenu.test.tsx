import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Locale } from '@renderer/i18n/locale'
import { applyBackdrop, readBackdrop } from '@renderer/theme/backdrop'
import { renderApp } from '@tests/helpers/render-app'

const root = document.documentElement
const bar = () => within(screen.getByRole('banner'))

/** Opens the theme list of the top bar and returns it. */
async function openThemes() {
  await userEvent.click(bar().getByRole('button', { name: /^(Theme|Thème) ?:/ }))
  return within(bar().getByRole('group', { name: /^(Theme|Thème)$/ }))
}

describe('theme menu', () => {
  it('is one discreet button on every page, showing the current theme', async () => {
    for (const path of ['/', '/glossary', '/image-study', '/color', '/mannequin', '/settings']) {
      const { unmount } = await renderApp(path, Locale.English)
      const button = bar().getByRole('button', { name: 'Theme: Neutral' })
      expect(button).toHaveAttribute('aria-expanded', 'false')
      expect(bar().queryByRole('group', { name: 'Theme' })).toBeNull()
      unmount()
    }
  })

  it('lists the five themes, Neutral first and Opal, the site theme, last, and closes once one is chosen', async () => {
    await renderApp('/', Locale.English)
    const list = await openThemes()
    expect(list.getAllByRole('button').map((b) => b.textContent)).toEqual([
      'Neutral',
      'Neutral grey',
      'Paper',
      'Contrast',
      'Opal',
    ])
    expect(list.getByRole('button', { name: 'Neutral' })).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(list.getByRole('button', { name: 'Opal' }))
    expect(root.dataset.backdrop).toBe('opal')
    expect(bar().queryByRole('group', { name: 'Theme' })).toBeNull()
    expect(bar().getByRole('button', { name: 'Theme: Opal' })).toBeInTheDocument()
  })

  it('closes with Escape or a click elsewhere', async () => {
    await renderApp('/', Locale.English)
    await openThemes()
    await userEvent.keyboard('{Escape}')
    expect(bar().queryByRole('group', { name: 'Theme' })).toBeNull()
    await openThemes()
    await userEvent.click(screen.getByRole('main'))
    expect(bar().queryByRole('group', { name: 'Theme' })).toBeNull()
  })

  it('applies to the whole app, is remembered, and stays when moving to a tool', async () => {
    const { unmount } = await renderApp('/', Locale.English)
    await userEvent.click((await openThemes()).getByRole('button', { name: 'Paper' }))
    expect(root.dataset.backdrop).toBe('paper')
    expect(localStorage.getItem('opal:studio:backdrop')).toBe('"paper"')
    unmount()

    await renderApp('/color', Locale.French)
    expect(root.dataset.backdrop).toBe('paper')
    await userEvent.click((await openThemes()).getByRole('button', { name: 'Neutre' }))
    expect(root.dataset.backdrop).toBeUndefined()
  })

  it('combines with day and night', async () => {
    await renderApp('/', Locale.English)
    await userEvent.click((await openThemes()).getByRole('button', { name: 'Contrast' }))
    await userEvent.click(bar().getByRole('button', { name: /Switch to (dark|light) theme/ }))
    expect(root.dataset.backdrop).toBe('contrast')
    expect(root.dataset.theme).toMatch(/^(dark|light)$/)
  })

  it('reads the choice already made in the tools (same storage key)', () => {
    localStorage.setItem('opal:studio:backdrop', '"grey"')
    expect(readBackdrop()).toBe('grey')
    applyBackdrop(readBackdrop())
    expect(root.dataset.backdrop).toBe('grey')
  })
})
