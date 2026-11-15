/**
 * Contract between the Electron preload script and the renderer.
 * The renderer imports these declarations with `import type` only,
 * so nothing from Electron ends up in the web bundle.
 */

export enum DesktopPlatform {
  Windows = 'win32',
  MacOS = 'darwin',
  Linux = 'linux',
}

/** Exposed on `window.opal` by the preload script; undefined in a browser. */
export interface OpalApi {
  readonly isDesktop: true
  readonly platform: DesktopPlatform
  readonly appVersion: string
}

/** Name of the global the API is exposed under. */
export const OPAL_API_KEY = 'opal'

/** Command-line switch used by the main process to hand the app version to the preload. */
export const APP_VERSION_ARG = '--opal-app-version='
