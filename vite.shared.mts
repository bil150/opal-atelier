/**
 * Renderer settings shared by the desktop build (electron.vite.config.mts),
 * the web/PWA build (vite.web.config.mts) and the tests (vitest.config.mts).
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Plugin, UserConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import packageJson from './package.json' with { type: 'json' }

export const RENDERER_ROOT = resolve(import.meta.dirname, 'src/renderer')

export const rendererAlias = {
  '@renderer': resolve(RENDERER_ROOT, 'src'),
  // Bridge contract shared with the Electron preload (plain TypeScript, never imports Electron).
  '@preload': resolve(import.meta.dirname, 'src/preload'),
}

/**
 * Content Security Policy, injected in production builds only
 * (the dev server needs inline scripts for React Fast Refresh).
 * - blob: for the pdf.js worker and object URLs of user images
 * - data: for images and fonts embedded by the build
 */
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "worker-src 'self' blob:",
  "connect-src 'self' blob: data:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ')

function contentSecurityPolicy(): Plugin {
  return {
    name: 'opal:content-security-policy',
    apply: 'build',
    transformIndexHtml: () => [
      {
        tag: 'meta',
        attrs: { 'http-equiv': 'Content-Security-Policy', content: CONTENT_SECURITY_POLICY },
        injectTo: 'head-prepend',
      },
    ],
  }
}

/** An open-source library shipped with the app, shown in Settings → About. */
export interface OpenSourceLibrary {
  readonly name: string
  readonly version: string
  readonly license: string
  readonly url: string
}

/** Libraries in the shipped app: the runtime dependencies, plus Electron for the desktop app. */
function openSourceLibraries(): OpenSourceLibrary[] {
  const names = [...Object.keys(packageJson.dependencies), 'electron'].sort()
  return names.map((name) => {
    const meta = JSON.parse(
      readFileSync(resolve(import.meta.dirname, 'node_modules', name, 'package.json'), 'utf8'),
    ) as { version?: string; license?: string; homepage?: string; repository?: string | { url?: string } }
    const repository = typeof meta.repository === 'string' ? meta.repository : meta.repository?.url
    const url = (meta.homepage ?? repository ?? `https://www.npmjs.com/package/${name}`)
      .replace(/^git\+/, '')
      .replace(/\.git$/, '')
      .replace(/^git:\/\//, 'https://')
      .replace(/#readme$/, '')
    return { name, version: meta.version ?? '', license: meta.license ?? '', url }
  })
}

/** Base renderer config. `base: './'` keeps every URL relative, so one build
 *  works under the GitHub Pages sub-folder and from file:// in Electron. */
export function rendererConfig(): UserConfig {
  return {
    root: RENDERER_ROOT,
    base: './',
    resolve: { alias: rendererAlias },
    define: {
      __APP_VERSION__: JSON.stringify(packageJson.version),
      __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
      __OPEN_SOURCE__: JSON.stringify(openSourceLibraries()),
    },
    plugins: [react(), tailwindcss(), contentSecurityPolicy()],
  }
}
