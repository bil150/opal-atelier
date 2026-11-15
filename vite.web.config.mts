/**
 * Web build: GitHub Pages + installable PWA (phone and desktop browsers).
 */
import { resolve } from 'node:path'
import { defineConfig, mergeConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { rendererConfig } from './vite.shared.mts'

export default defineConfig(
  mergeConfig(rendererConfig(), {
    build: {
      outDir: resolve(import.meta.dirname, 'dist-web'),
      emptyOutDir: true,
    },
    plugins: [
      VitePWA({
        // No server data to keep in sync: a new version simply takes over on next load.
        registerType: 'autoUpdate',
        includeAssets: ['icons/favicon.svg', 'icons/apple-touch-icon.png'],
        manifest: {
          id: './',
          name: 'Opal Atelier',
          short_name: 'Opal Atelier',
          description:
            'Learn, simulate, research, study: studio tools for the visual arts — image study, colour mixing, 3D mannequin and glossary.',
          lang: 'en',
          start_url: './',
          scope: './',
          display: 'standalone',
          orientation: 'any',
          background_color: '#2B5FB8',
          theme_color: '#2B5FB8',
          icons: [
            { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,woff2,mjs}'],
          // pdf.js and three.js chunks are large; cache them for offline use.
          maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
          cleanupOutdatedCaches: true,
        },
      }),
    ],
  }),
)
