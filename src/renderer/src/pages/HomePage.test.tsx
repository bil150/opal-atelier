import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Locale } from '@renderer/i18n/locale'
import { renderApp } from '@tests/helpers/render-app'
import { HOME_SECTIONS } from './home-sections'

describe('HomePage', () => {
  it('shows every section and tile of the original menu', async () => {
    await renderApp('/', Locale.French)
    const names = ['Étude d’image', 'Couleur', 'Pantin', 'Référence']
    names.forEach((name, i) => {
      const section = screen.getByRole('heading', { level: 2, name }).closest('section')!
      expect(within(section).getAllByRole('listitem')).toHaveLength(HOME_SECTIONS[i]!.tiles.length)
    })
  })

  it('links every tool, now that all of them are migrated', async () => {
    await renderApp('/', Locale.English)
    const reference = screen.getByRole('heading', { name: 'Reference' }).closest('section')!
    expect(within(reference).getByRole('link', { name: /Glossary/ })).toBeInTheDocument()

    const colour = screen.getByRole('heading', { name: 'Colour' }).closest('section')!
    expect(within(colour).getAllByRole('link')).toHaveLength(5)

    const mannequin = screen.getByRole('heading', { name: 'Mannequin' }).closest('section')!
    expect(within(mannequin).getAllByRole('link')).toHaveLength(3)
    expect(screen.queryByText('Coming soon')).toBeNull()
  })

  it('opens the glossary', async () => {
    await renderApp('/', Locale.English)
    await userEvent.click(within(screen.getByRole('main')).getByRole('link', { name: /Glossary/ }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Glossary' })).toBeInTheDocument()
    const trail = screen.getByRole('navigation', { name: 'Breadcrumb' })
    expect(within(trail).getByRole('link', { name: 'Opal Atelier' })).toHaveAttribute('href', '/')
    expect(trail).toHaveTextContent('Glossary')
  })

  it('welcomes with the promises of the app', async () => {
    await renderApp('/', Locale.French)
    expect(screen.getByRole('heading', { level: 1, name: 'Bienvenue à l’atelier' })).toBeInTheDocument()
    expect(screen.getByText('Fonctionne hors ligne')).toBeInTheDocument()
    const colour = screen.getByRole('heading', { level: 2, name: 'Couleur' }).closest('section')!
    expect(within(colour).getByText('5 outils')).toBeInTheDocument()
  })

  it('sends unknown addresses back home', async () => {
    await renderApp('/nowhere', Locale.English)
    expect(screen.getByRole('img', { name: 'Opal Atelier' })).toBeInTheDocument()
  })
})
