import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router'
import { App } from './App'
import { getEnvironmentStore } from './platform'
import { applyBackdrop, readBackdrop } from './theme/backdrop'
import { applyColorScheme, readColorScheme } from './theme/color-scheme'
import './i18n'
import './index.css'

// Apply the remembered light/dark choice and page theme before the first paint (no flash).
applyColorScheme(readColorScheme())
applyBackdrop(readBackdrop())

// Start listening right away: the browser fires its install prompt only once, early.
getEnvironmentStore()

const container = document.getElementById('root')
if (!container) throw new Error('Root element #root not found')

// HashRouter: works under the GitHub Pages sub-folder and from file:// in Electron
// without any server-side fallback.
createRoot(container).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
)
