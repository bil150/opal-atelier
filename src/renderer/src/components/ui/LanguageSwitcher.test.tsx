import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import i18n, { LOCALE_STORAGE_KEY } from '@renderer/i18n'
import { Locale } from '@renderer/i18n/locale'
import { LanguageSwitcher } from './LanguageSwitcher'

describe('LanguageSwitcher', () => {
  beforeEach(async () => {
    await i18n.changeLanguage(Locale.English)
  })

  it('switches the interface to French and remembers the choice', async () => {
    render(<LanguageSwitcher />)
    expect(screen.getByRole('button', { name: 'English' })).toHaveTextContent('EN')

    await userEvent.click(screen.getByRole('button', { name: 'Français' }))

    expect(i18n.resolvedLanguage).toBe(Locale.French)
    expect(document.documentElement.lang).toBe(Locale.French)
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe(Locale.French)
    expect(screen.getByRole('group', { name: 'Langue' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Français' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('spells the languages out in its wide form (menu, settings)', () => {
    render(<LanguageSwitcher wide />)
    expect(screen.getByRole('button', { name: 'Français' })).toHaveTextContent('Français')
  })
})
