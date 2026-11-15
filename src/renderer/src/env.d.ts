import type { OpalApi } from '@preload/opal-api'

declare global {
  /** An open-source library shipped with the app (Settings → About). */
  interface OpenSourceLibrary {
    readonly name: string
    readonly version: string
    readonly license: string
    readonly url: string
  }

  /** Injected at build time from package.json. */
  const __APP_VERSION__: string
  /** ISO date of the build. */
  const __BUILD_DATE__: string
  /** Libraries shipped with the app, read from node_modules at build time. */
  const __OPEN_SOURCE__: readonly OpenSourceLibrary[]

  interface Window {
    /** Present only inside the Electron app (see src/preload). */
    readonly opal?: OpalApi
  }
}

export {}
