import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import i18n from '@renderer/i18n'
import { Locale } from '@renderer/i18n/locale'
import { renderApp } from '@tests/helpers/render-app'
import { GLOSSARY } from './glossary-entries'

const termRow = (term: string) => screen.getByText(term, { selector: 'dt' }).parentElement!

describe('GlossaryPage', () => {
  it('lists every term, grouped by theme', async () => {
    await renderApp('/glossary', Locale.English)
    expect(screen.getByRole('heading', { level: 1, name: 'Glossary' })).toBeInTheDocument()
    expect(screen.getByText(`${GLOSSARY.length} terms`)).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Drawing' })).toBeInTheDocument()
    expect(document.title).toBe('Glossary · Opal Atelier')
  })

  it('searches without caring about accents or case', async () => {
    await renderApp('/glossary', Locale.French)
    await userEvent.type(screen.getByRole('searchbox'), 'EMPATEMENT')
    expect(screen.getByText('1 terme')).toBeInTheDocument()
    expect(screen.getByText('Empâtement', { selector: 'dt' })).toBeInTheDocument()
  })

  it('says so when nothing matches, and Escape clears the search', async () => {
    await renderApp('/glossary', Locale.English)
    const search = screen.getByRole('searchbox')
    await userEvent.type(search, 'zzzz')
    expect(screen.getByText('No term found.')).toBeInTheDocument()
    await userEvent.type(search, '{Escape}')
    expect(search).toHaveValue('')
  })

  it('filters by theme and remembers the choice', async () => {
    await renderApp('/glossary', Locale.English)
    const themes = screen.getByRole('group', { name: 'Themes' })
    await userEvent.click(within(themes).getByRole('button', { name: 'Composition' }))

    expect(within(themes).getByRole('button', { name: 'Composition' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.queryByRole('heading', { level: 2, name: 'Drawing' })).toBeNull()
    expect(localStorage.getItem('opal:glossary:theme')).toBe('"composition"')
  })

  it('follows a cross-reference, revealing a term hidden by the theme filter', async () => {
    await renderApp('/glossary', Locale.English)
    await userEvent.click(screen.getByRole('button', { name: 'Methods and techniques' }))

    // "Indirect method" links to "Grisaille", which belongs to the Colour theme.
    const indirect = termRow('Indirect method')
    await userEvent.click(within(indirect).getByRole('link', { name: 'grisaille' }))

    const grisaille = termRow('Grisaille')
    expect(grisaille).toHaveClass('animate-flash')
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('opens directly on a term from its link', async () => {
    await renderApp('/glossary/glaze', Locale.French)
    expect(termRow('Glacis')).toHaveClass('animate-flash')
  })

  it('switches language live', async () => {
    await renderApp('/glossary', Locale.English)
    expect(screen.getByText('Glaze', { selector: 'dt' })).toBeInTheDocument()
    await act(async () => {
      await i18n.changeLanguage(Locale.French)
    })
    expect(screen.getByText('Glacis', { selector: 'dt' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Glossaire' })).toBeInTheDocument()
  })
})
