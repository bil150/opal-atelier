import { describe, expect, it, vi } from 'vitest'
import { DesktopPlatform } from '@preload/opal-api'
import { FakeWindow, MediaFeature, createInstallPromptEvent } from '@tests/helpers/fake-window'
import { EnvironmentStore } from './environment-store'
import { InstallMethod, InstallResult } from './install-prompt'
import { Runtime } from './runtime'

const IPHONE_SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile Safari'

function setup(options?: ConstructorParameters<typeof FakeWindow>[0]) {
  const win = new FakeWindow(options)
  const store = new EnvironmentStore(win.asWindow())
  const listener = vi.fn()
  store.subscribe(listener)
  return { win, store, listener }
}

describe('EnvironmentStore', () => {
  it('describes a plain browser tab', () => {
    const { store } = setup()
    expect(store.getSnapshot()).toEqual({
      runtime: Runtime.Browser,
      desktopPlatform: null,
      appVersion: '0.0.0-test',
      isTouch: false,
      isOnline: true,
      installMethod: InstallMethod.None,
    })
  })

  it('describes the desktop app from the preload bridge', () => {
    const { store } = setup({
      opal: { isDesktop: true, platform: DesktopPlatform.Linux, appVersion: '2.0.0' },
    })
    expect(store.getSnapshot()).toMatchObject({
      runtime: Runtime.Desktop,
      desktopPlatform: DesktopPlatform.Linux,
      appVersion: '2.0.0',
    })
  })

  it('keeps the same snapshot object while nothing changes', () => {
    const { win, store, listener } = setup()
    const before = store.getSnapshot()
    win.dispatchEvent(new Event('online'))
    expect(store.getSnapshot()).toBe(before)
    expect(listener).not.toHaveBeenCalled()
  })

  it('follows connectivity', () => {
    const { win, store, listener } = setup()
    win.setOnline(false)
    expect(store.getSnapshot().isOnline).toBe(false)
    expect(listener).toHaveBeenCalledOnce()
  })

  it('follows the display mode when the PWA gets opened as an app', () => {
    const { win, store } = setup()
    win.setMedia(MediaFeature.Standalone, true)
    expect(store.getSnapshot().runtime).toBe(Runtime.InstalledApp)
  })

  it('follows the pointer type', () => {
    const { win, store } = setup()
    win.setMedia(MediaFeature.CoarsePointer, true)
    expect(store.getSnapshot().isTouch).toBe(true)
  })

  describe('install', () => {
    it('captures the browser prompt and shows it on demand', async () => {
      const { win, store, listener } = setup()
      const { event, prompt } = createInstallPromptEvent('accepted')

      win.dispatchEvent(event)
      expect(event.defaultPrevented).toBe(true)
      expect(store.getSnapshot().installMethod).toBe(InstallMethod.Prompt)
      expect(listener).toHaveBeenCalled()

      await expect(store.install()).resolves.toBe(InstallResult.Accepted)
      expect(prompt).toHaveBeenCalledOnce()
      expect(store.getSnapshot().installMethod).toBe(InstallMethod.None)
    })

    it('reports a dismissed prompt', async () => {
      const { win, store } = setup()
      win.dispatchEvent(createInstallPromptEvent('dismissed').event)
      await expect(store.install()).resolves.toBe(InstallResult.Dismissed)
    })

    it('forgets the prompt once the app is installed', () => {
      const { win, store } = setup()
      win.dispatchEvent(createInstallPromptEvent().event)
      win.dispatchEvent(new Event('appinstalled'))
      expect(store.getSnapshot().installMethod).toBe(InstallMethod.None)
    })

    it('asks for manual steps on iPhone Safari', async () => {
      const { store } = setup({ userAgent: IPHONE_SAFARI })
      expect(store.getSnapshot().installMethod).toBe(InstallMethod.ManualIos)
      await expect(store.install()).resolves.toBe(InstallResult.ManualStepsRequired)
    })

    it('offers nothing once installed on iPhone', () => {
      const { store } = setup({ userAgent: IPHONE_SAFARI, iosStandalone: true })
      expect(store.getSnapshot().installMethod).toBe(InstallMethod.None)
    })

    it('is unavailable in the desktop app', async () => {
      const { win, store } = setup({
        opal: { isDesktop: true, platform: DesktopPlatform.Windows, appVersion: '1.0.0' },
      })
      win.dispatchEvent(createInstallPromptEvent().event)
      expect(store.getSnapshot().installMethod).toBe(InstallMethod.None)
      await expect(store.install()).resolves.toBe(InstallResult.Unavailable)
    })
  })
})
