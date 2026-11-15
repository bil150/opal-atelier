/**
 * Everything that depends on where the app runs (Electron, installed PWA, browser).
 * Features import from here, never from `window.opal` or browser-specific APIs directly.
 */
export { DesktopPlatform } from '@preload/opal-api'
export { Runtime } from './runtime'
export { InstallMethod, InstallResult } from './install-prompt'
export { getEnvironmentStore, type Environment } from './environment-store'
export { saveFile, SaveOutcome, type SaveFileOptions } from './save-file'
