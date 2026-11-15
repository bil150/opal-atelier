import type { DesktopPlatform } from '@preload/opal-api'
import {
  APP_INSTALLED,
  BEFORE_INSTALL_PROMPT,
  InstallMethod,
  InstallResult,
  type BeforeInstallPromptEvent,
} from './install-prompt'
import {
  Runtime,
  STANDALONE_MEDIA_QUERY,
  detectRuntime,
  isIosSafari,
  mediaMatches,
  probeRuntime,
} from './runtime'

const COARSE_POINTER_QUERY = '(pointer: coarse)'

/** Everything the UI may need to know about where it runs. Immutable snapshot. */
export interface Environment {
  readonly runtime: Runtime
  /** Operating system of the desktop app; null outside Electron. */
  readonly desktopPlatform: DesktopPlatform | null
  readonly appVersion: string
  /** Main pointer is a finger (phone, tablet) rather than a mouse. */
  readonly isTouch: boolean
  readonly isOnline: boolean
  readonly installMethod: InstallMethod
}

type Listener = () => void

/**
 * Keeps an up-to-date Environment snapshot and notifies subscribers when it changes
 * (install, display mode, connectivity, pointer). Shaped for React's useSyncExternalStore.
 */
export class EnvironmentStore {
  readonly #win: Window
  readonly #listeners = new Set<Listener>()
  #deferredPrompt: BeforeInstallPromptEvent | null = null
  #snapshot: Environment

  constructor(win: Window) {
    this.#win = win
    this.#snapshot = this.#read()

    win.addEventListener(BEFORE_INSTALL_PROMPT, (event) => {
      event.preventDefault() // keep it for our own install button
      this.#deferredPrompt = event as BeforeInstallPromptEvent
      this.#refresh()
    })
    win.addEventListener(APP_INSTALLED, () => {
      this.#deferredPrompt = null
      this.#refresh()
    })
    win.addEventListener('online', this.#refresh)
    win.addEventListener('offline', this.#refresh)
    for (const query of [STANDALONE_MEDIA_QUERY, COARSE_POINTER_QUERY]) {
      if (typeof win.matchMedia === 'function')
        win.matchMedia(query).addEventListener('change', this.#refresh)
    }
  }

  readonly subscribe = (listener: Listener): (() => void) => {
    this.#listeners.add(listener)
    return () => this.#listeners.delete(listener)
  }

  readonly getSnapshot = (): Environment => this.#snapshot

  /** Opens the browser's install dialog when there is one. */
  readonly install = async (): Promise<InstallResult> => {
    switch (this.#snapshot.installMethod) {
      case InstallMethod.ManualIos:
        return InstallResult.ManualStepsRequired
      case InstallMethod.None:
        return InstallResult.Unavailable
      case InstallMethod.Prompt: {
        const prompt = this.#deferredPrompt
        if (!prompt) return InstallResult.Unavailable
        this.#deferredPrompt = null // a prompt can only be used once
        await prompt.prompt()
        const { outcome } = await prompt.userChoice
        this.#refresh()
        return outcome === 'accepted' ? InstallResult.Accepted : InstallResult.Dismissed
      }
    }
  }

  readonly #refresh = (): void => {
    const next = this.#read()
    if (shallowEqual(next, this.#snapshot)) return
    this.#snapshot = next
    for (const listener of this.#listeners) listener()
  }

  #read(): Environment {
    const runtime = detectRuntime(probeRuntime(this.#win))
    const opal = this.#win.opal
    return {
      runtime,
      desktopPlatform: opal?.platform ?? null,
      appVersion: opal?.appVersion ?? __APP_VERSION__,
      isTouch: mediaMatches(this.#win, COARSE_POINTER_QUERY),
      isOnline: this.#win.navigator.onLine,
      installMethod: this.#installMethod(runtime),
    }
  }

  #installMethod(runtime: Runtime): InstallMethod {
    if (runtime !== Runtime.Browser) return InstallMethod.None
    if (this.#deferredPrompt) return InstallMethod.Prompt
    if (isIosSafari(this.#win.navigator.userAgent)) return InstallMethod.ManualIos
    return InstallMethod.None
  }
}

function shallowEqual(a: Environment, b: Environment): boolean {
  return (Object.keys(a) as (keyof Environment)[]).every((key) => a[key] === b[key])
}

let store: EnvironmentStore | null = null

/** App-wide store. Created on first use; call it at startup so no install prompt is missed. */
export function getEnvironmentStore(): EnvironmentStore {
  store ??= new EnvironmentStore(window)
  return store
}
