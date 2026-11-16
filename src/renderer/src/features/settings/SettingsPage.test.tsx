import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resetTubeStoreForTests } from '@renderer/features/paints/tube-store'
import { Locale } from '@renderer/i18n/locale'
import { renderApp } from '@tests/helpers/render-app'
import { appStorageBytes, wipeAppData } from './app-data'

const root = document.documentElement
const section = (name: string) => screen.getByRole('heading', { level: 2, name }).closest('section')!

beforeEach(() => {
  resetTubeStoreForTests()
})

describe('Settings', () => {
  it('opens from the gear of the top bar, on every page', async () => {
    await renderApp('/color', Locale.English)
    await userEvent.click(screen.getByRole('link', { name: 'Settings' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Settings' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('aria-current', 'page')
  })

  it('starts in day mode, and offers night and the device setting', async () => {
    await renderApp('/settings', Locale.French)
    const appearance = section('Apparence')
    const scheme = within(appearance).getByRole('group', { name: 'Jour ou nuit' })
    expect(within(scheme).getByRole('button', { name: 'Jour' })).toHaveAttribute('aria-pressed', 'true')

    await userEvent.click(within(scheme).getByRole('button', { name: 'Nuit' }))
    expect(root.dataset.theme).toBe('dark')
    expect(localStorage.getItem('opal:color-scheme')).toBe('"dark"')
    // the top bar button follows
    expect(screen.getByRole('button', { name: 'Passer en thème clair' })).toBeInTheDocument()

    await userEvent.click(within(scheme).getByRole('button', { name: 'Appareil' }))
    expect(root.dataset.theme).toBeUndefined()
  })

  it('chooses the page theme, in step with the top bar', async () => {
    await renderApp('/settings', Locale.English)
    const theme = within(section('Appearance')).getByRole('group', { name: 'Theme' })
    await userEvent.click(within(theme).getByRole('button', { name: /Neutral grey/ }))
    expect(root.dataset.backdrop).toBe('grey')
    const bar = screen.getByRole('banner')
    expect(within(bar).getByRole('button', { name: 'Theme: Neutral grey' })).toBeInTheDocument()
  })

  it('leads to the Image study configuration', async () => {
    await renderApp('/settings', Locale.French)
    await userEvent.click(
      within(section('Outils')).getByRole('link', { name: /Configuration de l’Étude d’image/ }),
    )
    expect(await screen.findByRole('tab', { name: 'Configuration' })).toHaveAttribute('aria-selected', 'true')
  })

  it('switches the language', async () => {
    await renderApp('/settings', Locale.English)
    await userEvent.click(within(section('Language')).getByRole('button', { name: 'Français' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Paramètres' })).toBeInTheDocument()
  })

  it('links the desktop installers on a computer, and explains the phone install', async () => {
    await renderApp('/settings', Locale.French)
    const app = section('Application')
    expect(within(app).getByRole('link', { name: 'Télécharger' })).toHaveAttribute(
      'href',
      'https://github.com/bil150/opal-atelier/releases/latest',
    )
    expect(within(app).getByText('Windows, macOS et Linux')).toBeInTheDocument()
    expect(within(app).getByRole('link', { name: 'bil150.github.io/opal-atelier' })).toHaveAttribute(
      'href',
      'https://bil150.github.io/opal-atelier/',
    )
    expect(within(app).getByText(/Sur l’écran d’accueil/)).toBeInTheDocument()
  })

  it('tells how much is stored and deletes everything once confirmed', async () => {
    localStorage.setItem(
      'opal:tubes',
      JSON.stringify({ v: 2, tubes: [{ id: 'a', name: 'Blue', hex: '#2233aa' }] }),
    )
    localStorage.setItem('opal:studio:backdrop', '"paper"')
    localStorage.setItem('elsewhere', 'kept')
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    await renderApp('/settings', Locale.English)
    expect(
      within(section('Data on this device')).getByText(/used: your tubes and settings/),
    ).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Delete all data' }))
    expect(confirm).toHaveBeenCalled()
    expect(screen.getByRole('status')).toHaveTextContent('All data deleted on this device.')
    expect(JSON.parse(localStorage.getItem('opal:tubes') ?? 'null')).toMatchObject({ tubes: [] })
    expect(localStorage.getItem('opal:studio:backdrop')).toBe('"opal"')
    expect(localStorage.getItem('elsewhere')).toBe('kept')
    expect(root.dataset.backdrop).toBe('opal') // back to the default theme
  })

  it('shows the version, build date, author, licenses and open-source libraries', async () => {
    await renderApp('/settings', Locale.French)
    const about = section('À propos')
    expect(within(about).getByText('Version 0.0.0-test · Compilée le 15 novembre 2026')).toBeInTheDocument()
    expect(within(about).getByRole('link', { name: '@bil150' })).toHaveAttribute(
      'href',
      'https://github.com/bil150',
    )
    expect(within(about).getByText('Code : GNU GPL v3.0 ou ultérieure')).toBeInTheDocument()
    expect(within(about).getByRole('link', { name: 'three' })).toHaveAttribute('href', 'https://threejs.org')
    expect(within(about).getByText('0.180.0 · MIT')).toBeInTheDocument()
  })
})

describe('app data', () => {
  it('counts only the app’s own entries', () => {
    localStorage.setItem('opal:a', '12')
    localStorage.setItem('other', 'not counted')
    expect(appStorageBytes()).toBe(('opal:a'.length + 2) * 2)
  })

  it('is null when storage is blocked, and wiping then still resets the stores', () => {
    const blocked = {
      get length(): number {
        throw new Error('blocked')
      },
    } as unknown as Storage
    expect(appStorageBytes(blocked)).toBeNull()
    expect(() => wipeAppData(blocked)).not.toThrow()
  })
})
