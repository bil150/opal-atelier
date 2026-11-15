import { act, render } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { App } from '@renderer/App'
import i18n from '@renderer/i18n'
import type { Locale } from '@renderer/i18n/locale'
import { loadAllPages } from '@renderer/lazy-pages'

/** Renders the whole app at `path`, in the given language. */
export async function renderApp(path: string, locale: Locale) {
  await i18n.changeLanguage(locale)
  const view = render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
  // The tools are lazy: let them load so the page is complete when the test starts.
  await act(async () => {
    await loadAllPages()
  })
  return view
}
