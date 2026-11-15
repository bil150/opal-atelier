import { useMemo, useSyncExternalStore } from 'react'
import { getEnvironmentStore, Runtime, type Environment, type InstallResult } from '@renderer/platform'

export interface EnvironmentState extends Environment {
  readonly isDesktop: boolean
  readonly isInstalledApp: boolean
  readonly isBrowser: boolean
  /** Opens the install dialog (or reports that manual steps are needed on iOS). */
  readonly install: () => Promise<InstallResult>
}

/** Live view of the runtime environment; re-renders when it changes (install, offline…). */
export function useEnvironment(): EnvironmentState {
  const store = getEnvironmentStore()
  const environment = useSyncExternalStore(store.subscribe, store.getSnapshot)

  return useMemo(
    () => ({
      ...environment,
      isDesktop: environment.runtime === Runtime.Desktop,
      isInstalledApp: environment.runtime === Runtime.InstalledApp,
      isBrowser: environment.runtime === Runtime.Browser,
      install: store.install,
    }),
    [environment, store],
  )
}
