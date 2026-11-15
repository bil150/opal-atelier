/** Chromium's install prompt event (not yet in the TypeScript DOM library). */
export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: readonly string[]
  readonly userChoice: Promise<{ readonly outcome: 'accepted' | 'dismissed'; readonly platform: string }>
  prompt(): Promise<void>
}

/** How the app can be installed in the current context. */
export enum InstallMethod {
  /** Already installed, or running as the desktop app. */
  None = 'none',
  /** The browser offers its own install dialog (Chrome, Edge, Android). */
  Prompt = 'prompt',
  /** iPhone / iPad: Share → Add to Home Screen. */
  ManualIos = 'manual-ios',
}

export enum InstallResult {
  Accepted = 'accepted',
  Dismissed = 'dismissed',
  /** The user has to follow manual steps (see InstallMethod.ManualIos). */
  ManualStepsRequired = 'manual-steps-required',
  Unavailable = 'unavailable',
}

export const BEFORE_INSTALL_PROMPT = 'beforeinstallprompt'
export const APP_INSTALLED = 'appinstalled'
