import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { rendererAlias } from './vite.shared.mts'

export default defineConfig({
  plugins: [react()],
  // @tests: shared fixtures (outputs of the original site) and test helpers.
  resolve: { alias: { ...rendererAlias, '@tests': resolve(import.meta.dirname, 'tests') } },
  define: {
    __APP_VERSION__: JSON.stringify('0.0.0-test'),
    __BUILD_DATE__: JSON.stringify('2026-11-15T12:00:00.000Z'),
    __OPEN_SOURCE__: JSON.stringify([
      { name: 'react', version: '19.0.0', license: 'MIT', url: 'https://react.dev' },
      { name: 'three', version: '0.180.0', license: 'MIT', url: 'https://threejs.org' },
    ]),
  },
  test: {
    root: import.meta.dirname,
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}', 'tests/**/*.test.{ts,tsx}'],
    setupFiles: ['./tests/setup.ts'],
    restoreMocks: true,
  },
})
