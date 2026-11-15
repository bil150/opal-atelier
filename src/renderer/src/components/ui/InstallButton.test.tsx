import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, describe, expect, it } from 'vitest'
import i18n from '@renderer/i18n'
import { Locale } from '@renderer/i18n/locale'
import { getEnvironmentStore } from '@renderer/platform'
import { createInstallPromptEvent } from '@tests/helpers/fake-window'
import { InstallButton } from './InstallButton'

describe('InstallButton', () => {
  beforeAll(async () => {
    getEnvironmentStore() // listen before the browser fires its prompt, as main.tsx does
    await i18n.changeLanguage(Locale.English)
  })

  it('stays hidden until the browser offers installation', () => {
    render(<InstallButton />)
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('opens the browser install dialog, then disappears once accepted', async () => {
    render(<InstallButton />)
    const { event, prompt } = createInstallPromptEvent('accepted')

    act(() => {
      window.dispatchEvent(event)
    })
    await userEvent.click(screen.getByRole('button', { name: 'Install the app' }))

    expect(prompt).toHaveBeenCalledOnce()
    expect(screen.queryByRole('button')).toBeNull()
  })
})
