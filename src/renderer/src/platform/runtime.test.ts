import { describe, expect, it } from 'vitest'
import { DesktopPlatform, type OpalApi } from '@preload/opal-api'
import { FakeWindow } from '@tests/helpers/fake-window'
import { Runtime, detectRuntime, isIosSafari, probeRuntime, type RuntimeProbe } from './runtime'

const opal: OpalApi = { isDesktop: true, platform: DesktopPlatform.Windows, appVersion: '1.2.3' }
const browser: RuntimeProbe = { opal: undefined, standaloneDisplay: false, iosStandalone: false }

describe('detectRuntime', () => {
  it.each<[string, RuntimeProbe, Runtime]>([
    ['a browser tab', browser, Runtime.Browser],
    ['an installed PWA', { ...browser, standaloneDisplay: true }, Runtime.InstalledApp],
    ['an iOS home-screen app', { ...browser, iosStandalone: true }, Runtime.InstalledApp],
    ['the Electron app', { ...browser, opal }, Runtime.Desktop],
    [
      'Electron even if a display-mode query matches',
      { opal, standaloneDisplay: true, iosStandalone: false },
      Runtime.Desktop,
    ],
  ])('detects %s', (_, probe, expected) => {
    expect(detectRuntime(probe)).toBe(expected)
  })
})

describe('probeRuntime', () => {
  it('reads the bridge, the display mode and the iOS flag', () => {
    const win = new FakeWindow({ opal, standalone: true, iosStandalone: true }).asWindow()
    expect(probeRuntime(win)).toEqual({ opal, standaloneDisplay: true, iosStandalone: true })
  })

  it('copes with a window that has no matchMedia', () => {
    const win = { navigator: {}, opal: undefined } as unknown as Window
    expect(probeRuntime(win)).toEqual(browser)
  })
})

describe('isIosSafari', () => {
  it.each([
    [
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile Safari',
      true,
    ],
    ['Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Safari', true],
    ['Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) CriOS/140.0 Mobile Safari', false],
    ['Mozilla/5.0 (Linux; Android 15) Chrome/140.0 Mobile Safari/537.36', false],
  ])('%s → %s', (userAgent, expected) => {
    expect(isIosSafari(userAgent)).toBe(expected)
  })
})
