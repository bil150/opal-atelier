import { vi } from 'vitest'
import type { OpalApi } from '@preload/opal-api'

export enum MediaFeature {
  Standalone = 'standalone',
  CoarsePointer = 'coarse-pointer',
}

export interface FakeWindowOptions {
  readonly opal?: OpalApi
  readonly standalone?: boolean
  readonly coarsePointer?: boolean
  readonly online?: boolean
  readonly userAgent?: string
  readonly iosStandalone?: boolean
}

const DESKTOP_CHROME_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36'

/** Minimal stand-in for `window`: events, matchMedia and the navigator fields the platform layer reads. */
export class FakeWindow extends EventTarget {
  readonly opal: OpalApi | undefined
  readonly navigator: { onLine: boolean; userAgent: string; standalone?: boolean }
  readonly #media = new Map<MediaFeature, boolean>()
  readonly #mediaTargets = new Map<MediaFeature, EventTarget>()

  constructor(options: FakeWindowOptions = {}) {
    super()
    this.opal = options.opal
    this.navigator = {
      onLine: options.online ?? true,
      userAgent: options.userAgent ?? DESKTOP_CHROME_UA,
      ...(options.iosStandalone === undefined ? {} : { standalone: options.iosStandalone }),
    }
    this.#media.set(MediaFeature.Standalone, options.standalone ?? false)
    this.#media.set(MediaFeature.CoarsePointer, options.coarsePointer ?? false)
  }

  matchMedia(query: string): MediaQueryList {
    const feature = query.includes('display-mode') ? MediaFeature.Standalone : MediaFeature.CoarsePointer
    let target = this.#mediaTargets.get(feature)
    if (!target) {
      target = new EventTarget()
      this.#mediaTargets.set(feature, target)
    }
    const matches = this.#media.get(feature) ?? false
    return Object.assign(target, { matches, media: query }) as unknown as MediaQueryList
  }

  /** Changes a media feature and fires its `change` event, like the browser does. */
  setMedia(feature: MediaFeature, matches: boolean): void {
    this.#media.set(feature, matches)
    this.#mediaTargets.get(feature)?.dispatchEvent(new Event('change'))
  }

  setOnline(online: boolean): void {
    this.navigator.onLine = online
    this.dispatchEvent(new Event(online ? 'online' : 'offline'))
  }

  asWindow(): Window {
    return this as unknown as Window
  }
}

/** A cancelable `beforeinstallprompt` event whose dialog resolves with the given outcome. */
export function createInstallPromptEvent(outcome: 'accepted' | 'dismissed' = 'accepted') {
  const prompt = vi.fn(() => Promise.resolve())
  const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
    platforms: ['web'],
    prompt,
    userChoice: Promise.resolve({ outcome, platform: 'web' }),
  })
  return { event, prompt }
}
