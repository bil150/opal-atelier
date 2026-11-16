import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Panel } from './Panel'
import { CollapsiblePanels } from './panel-collapse'

const screenIs = (phone: boolean) =>
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: phone && query.includes('max-width'),
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }))

const inDashboard = (panel: React.ReactNode) =>
  render(<CollapsiblePanels.Provider value={true}>{panel}</CollapsiblePanels.Provider>)

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('Panel', () => {
  it('is a plain panel outside a studio dashboard, even on a phone', () => {
    screenIs(true)
    render(
      <Panel title="Recipe">
        <p>Content</p>
      </Panel>,
    )
    expect(screen.getByRole('heading', { name: 'Recipe' })).toBeInTheDocument()
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.getByText('Content')).toBeVisible()
  })

  it('never folds on a large screen: always open, no button', () => {
    screenIs(false)
    inDashboard(
      <Panel title="Navigation">
        <p>Content</p>
      </Panel>,
    )
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.getByText('Content')).toBeVisible()
  })

  it('folds and unfolds from its title on a phone (small / large), folded at first', async () => {
    screenIs(true)
    inDashboard(
      <Panel title="Navigation">
        <p>Content</p>
      </Panel>,
    )
    const title = screen.getByRole('button', { name: 'Navigation' })
    expect(title).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByText('Content')).not.toBeVisible()
    await userEvent.click(title)
    expect(title).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('Content')).toBeVisible()
  })

  it('opens the main panel of a tab at first on a phone, and tells when a panel opens', async () => {
    screenIs(true)
    const onToggle = vi.fn()
    inDashboard(
      <>
        <Panel title="Recipe" defaultOpen>
          <p>Recipe content</p>
        </Panel>
        <Panel title="Advice" onToggle={onToggle}>
          <p>Advice content</p>
        </Panel>
      </>,
    )
    expect(screen.getByText('Recipe content')).toBeVisible()
    await userEvent.click(screen.getByRole('button', { name: 'Advice' }))
    expect(onToggle).toHaveBeenCalledWith(true)
  })
})
