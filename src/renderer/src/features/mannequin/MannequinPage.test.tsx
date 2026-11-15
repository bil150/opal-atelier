import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Locale } from '@renderer/i18n/locale'
import { renderApp } from '@tests/helpers/render-app'
import type { Pose } from './poses'

/** Stand-in for the WebGL scene: records what the page asks of it. */
const calls = vi.hoisted(() => ({
  poses: [] as string[],
  settings: [] as unknown[],
  cameras: [] as [number, number][],
}))

vi.mock('./scene/mannequin-scene', () => ({
  MannequinScene: class {
    camera = { azimuth: 35, elevation: 10 }
    distance = 22
    showPose(pose: Pose) {
      calls.poses.push(pose.id)
    }
    setSettings(settings: unknown) {
      calls.settings.push(settings)
    }
    setCamera(azimuth: number, elevation: number) {
      calls.cameras.push([azimuth, elevation])
    }
    refit = vi.fn()
    setBackdrop = vi.fn()
    resize = vi.fn()
    zoom = vi.fn()
    setDistance = vi.fn()
    toPng() {
      return Promise.resolve(null)
    }
    dispose = vi.fn()
  },
}))

const stored = (key: string): unknown => JSON.parse(localStorage.getItem(`opal:${key}`) ?? 'null')

let webgl = true
beforeEach(() => {
  webgl = true
  calls.poses.length = calls.settings.length = calls.cameras.length = 0
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
    () => (webgl ? {} : null) as unknown as null,
  )
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('Mannequin', () => {
  it('opens on the poses, with the sections of the original page', async () => {
    await renderApp('/mannequin', Locale.English)
    const tabs = screen.getAllByRole('tab').map((t) => t.getAttribute('aria-label'))
    expect(tabs).toEqual(['Poses', 'Timed sketch', 'Light and values'])
    for (const title of ['Pose', 'View', 'Figure'])
      expect(screen.getByRole('heading', { name: title })).toBeInTheDocument()
    expect(screen.getByText('Standing at rest', { selector: 'b' })).toBeInTheDocument()
    expect(screen.getByText(/Standing · 1 \/ 28/)).toBeInTheDocument()
    expect(calls.poses).toEqual(['rest'])
  })

  it('explains when 3D isn’t available', async () => {
    webgl = false
    await renderApp('/mannequin/poses', Locale.French)
    expect(screen.getByRole('alert')).toHaveTextContent('L’affichage 3D n’est pas disponible')
  })

  it('changes pose from the list and the buttons, and remembers it', async () => {
    await renderApp('/mannequin/poses', Locale.English)
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Choose a pose' }), 'walk')
    expect(calls.poses.at(-1)).toBe('walk')
    expect(stored('mannequin:pose')).toBe('walk')
    await userEvent.click(screen.getByRole('button', { name: 'Next pose' }))
    expect(calls.poses.at(-1)).toBe('run')
    await userEvent.click(screen.getByRole('button', { name: 'Previous pose' }))
    await userEvent.click(screen.getByRole('button', { name: 'Previous pose' }))
    expect(calls.poses.at(-1)).toBe('kneel')
  })

  it('turns to a pose’s suggested viewpoint, and to the view presets', async () => {
    await renderApp('/mannequin/poses', Locale.English)
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Choose a pose' }), 'kiosk')
    expect(calls.cameras.at(-1)).toEqual([130, 12])
    await userEvent.click(screen.getByRole('button', { name: 'Profile' }))
    expect(calls.cameras.at(-1)).toEqual([90, 6])
  })

  it('changes pose with Page Down outside the fields', async () => {
    await renderApp('/mannequin/poses', Locale.English)
    await userEvent.keyboard('{PageDown}')
    expect(calls.poses.at(-1)).toBe('contrapposto')
  })

  it('draws a random pose, never the same twice in a row', async () => {
    await renderApp('/mannequin/poses', Locale.English)
    for (let i = 0; i < 5; i++) await userEvent.click(screen.getByRole('button', { name: 'Random pose' }))
    const drawn = calls.poses.slice(1)
    expect(new Set(drawn).size).toBe(5)
    expect(drawn).not.toContain('rest')
  })

  it('remembers the figure and passes it to the scene', async () => {
    await renderApp('/mannequin/poses', Locale.English)
    await userEvent.click(screen.getByRole('button', { name: 'Female' }))
    expect(stored('mannequin:settings')).toMatchObject({ shape: 'female' })
    expect(calls.settings.at(-1)).toMatchObject({ shape: 'female' })
  })

  it('sets the light from a preset and the values rendering', async () => {
    await renderApp('/mannequin/light', Locale.English)
    await userEvent.click(screen.getByRole('button', { name: 'Raking' }))
    expect(screen.getByRole('button', { name: 'Raking' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('slider', { name: 'Light height' })).toHaveValue('8')
    await userEvent.click(screen.getByRole('button', { name: '2 values' }))
    expect(stored('mannequin:settings')).toMatchObject({ lightAzimuth: 90, lightElevation: 8, shading: '2' })
  })

  it('runs a timed sketch and moves to a new pose when the time is up', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    await renderApp('/mannequin/sketch', Locale.English)
    const timerPanel = screen.getByRole('heading', { name: 'Timed sketch' }).parentElement!
    await userEvent.click(within(timerPanel).getByRole('button', { name: '30 s' }))
    expect(within(timerPanel).getByLabelText('Time left')).toHaveTextContent('0:30')
    await userEvent.click(within(timerPanel).getByRole('button', { name: 'Start' }))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(31_000)
    })
    expect(calls.poses.length).toBeGreaterThan(1)
    expect(screen.getByText('1 pose drawn')).toBeInTheDocument()
    await userEvent.click(within(timerPanel).getByRole('button', { name: 'Pause' }))
    expect(within(timerPanel).getByRole('button', { name: 'Resume' })).toBeInTheDocument()
  })
})
