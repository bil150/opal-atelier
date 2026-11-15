import type { OpalApi } from '@preload/opal-api'

/** Where the app is running. */
export enum Runtime {
  /** Electron desktop app. */
  Desktop = 'desktop',
  /** PWA installed on a phone, tablet or computer (own window, no browser UI). */
  InstalledApp = 'installed-app',
  /** Regular browser tab (GitHub Pages). */
  Browser = 'browser',
}

/** Display modes in which an installed PWA runs. */
export const STANDALONE_MEDIA_QUERY =
  '(display-mode: standalone), (display-mode: window-controls-overlay), (display-mode: fullscreen)'

/** Raw signals read from the browser; kept separate so detection stays a pure function. */
export interface RuntimeProbe {
  readonly opal: OpalApi | undefined
  /** `display-mode` media query matches an installed-app mode. */
  readonly standaloneDisplay: boolean
  /** iOS Safari's non-standard flag for home-screen web apps. */
  readonly iosStandalone: boolean
}

export function detectRuntime(probe: RuntimeProbe): Runtime {
  if (probe.opal?.isDesktop) return Runtime.Desktop
  if (probe.standaloneDisplay || probe.iosStandalone) return Runtime.InstalledApp
  return Runtime.Browser
}

interface NavigatorWithStandalone extends Navigator {
  readonly standalone?: boolean
}

/** `matchMedia` is missing in some test and embedded environments. */
export function mediaMatches(win: Window, query: string): boolean {
  return typeof win.matchMedia === 'function' && win.matchMedia(query).matches
}

export function probeRuntime(win: Window): RuntimeProbe {
  return {
    opal: win.opal,
    standaloneDisplay: mediaMatches(win, STANDALONE_MEDIA_QUERY),
    iosStandalone: (win.navigator as NavigatorWithStandalone).standalone === true,
  }
}

/** iPhone / iPad Safari: no install prompt, the user goes through the Share menu. */
export function isIosSafari(userAgent: string): boolean {
  const isIos = /iphone|ipad|ipod/i.test(userAgent)
  const isOtherBrowser = /crios|fxios|edgios/i.test(userAgent)
  return isIos && !isOtherBrowser
}
