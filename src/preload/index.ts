import { contextBridge } from 'electron'
import { APP_VERSION_ARG, DesktopPlatform, OPAL_API_KEY, type OpalApi } from './opal-api'

function toDesktopPlatform(platform: NodeJS.Platform): DesktopPlatform {
  switch (platform) {
    case 'win32':
      return DesktopPlatform.Windows
    case 'darwin':
      return DesktopPlatform.MacOS
    default:
      return DesktopPlatform.Linux
  }
}

function readAppVersion(): string {
  const arg = process.argv.find((value) => value.startsWith(APP_VERSION_ARG))
  return arg?.slice(APP_VERSION_ARG.length) ?? ''
}

const api: OpalApi = {
  isDesktop: true,
  platform: toDesktopPlatform(process.platform),
  appVersion: readAppVersion(),
}

contextBridge.exposeInMainWorld(OPAL_API_KEY, api)
