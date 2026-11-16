import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Locale } from '@renderer/i18n/locale'
import { renderApp } from '@tests/helpers/render-app'

const bar = () => screen.getByRole('banner')

describe('app bar', () => {
  it('links the tools and marks the current one', async () => {
    await renderApp('/color/mix', Locale.English)
    const nav = within(bar()).getAllByRole('navigation', { name: 'Main menu' })[0]!
    const links = within(nav)
      .getAllByRole('link')
      .map((l) => l.textContent)
    expect(links).toEqual(['Image study', 'Colour', 'Mannequin', 'Glossary'])
    expect(within(nav).getByRole('link', { name: 'Colour' })).toHaveAttribute('aria-current', 'page')
    expect(within(nav).getByRole('link', { name: 'Glossary' })).not.toHaveAttribute('aria-current')
  })

  it('groups theme, day/night, language and settings', async () => {
    await renderApp('/', Locale.English)
    const b = within(bar())
    expect(b.getByRole('button', { name: 'Theme: Opal' })).toBeInTheDocument()
    expect(b.getByRole('button', { name: /Switch to (dark|light) theme/ })).toBeInTheDocument()
    expect(b.getByRole('group', { name: 'Language' })).toBeInTheDocument()
    expect(b.getByRole('link', { name: 'Settings' })).toHaveAttribute('href', '/settings')
  })

  it('opens a menu on small screens, closed by Escape or by moving to a page', async () => {
    await renderApp('/', Locale.French)
    const burger = within(bar()).getByRole('button', { name: 'Ouvrir le menu' })
    expect(burger).toHaveAttribute('aria-expanded', 'false')

    await userEvent.click(burger)
    expect(burger).toHaveAttribute('aria-expanded', 'true')
    expect(burger).toHaveAccessibleName('Fermer le menu')
    const panel = document.getElementById(burger.getAttribute('aria-controls')!)!
    expect(within(panel).getByRole('link', { name: 'Accueil' })).toHaveAttribute('aria-current', 'page')
    expect(within(panel).getByRole('button', { name: 'Opale' })).toHaveTextContent('Opale')
    expect(within(panel).getByRole('button', { name: 'Français' })).toHaveTextContent('Français')

    await userEvent.keyboard('{Escape}')
    expect(burger).toHaveAttribute('aria-expanded', 'false')

    await userEvent.click(burger)
    const reopened = document.getElementById(burger.getAttribute('aria-controls')!)!
    await userEvent.click(within(reopened).getByRole('link', { name: 'Pantin' }))
    expect(await screen.findByRole('tab', { name: 'Poses' })).toBeInTheDocument()
    expect(within(bar()).getByRole('button', { name: 'Ouvrir le menu' })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
  })
})
