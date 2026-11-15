import { defineConfig, mergeConfig } from 'vite'
import { defineConfig as defineElectronConfig } from 'electron-vite'
import { rendererConfig } from './vite.shared.mts'

// out/ sits outside each process root, so it has to be emptied explicitly.
const clean = { build: { emptyOutDir: true } }

export default defineElectronConfig({
  main: clean,
  preload: clean,
  // Same renderer as the web build, minified, without the service worker:
  // the desktop app already runs from local files.
  renderer: mergeConfig(rendererConfig(), defineConfig({ build: { emptyOutDir: true, minify: true } })),
})
