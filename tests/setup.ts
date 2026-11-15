import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'
import { resetBackdropForTests } from '@renderer/theme/backdrop'
import { resetColorSchemeForTests } from '@renderer/theme/color-scheme'

// jsdom does not implement scrolling.
Element.prototype.scrollIntoView = vi.fn()

afterEach(() => {
  cleanup()
  localStorage.clear()
  resetBackdropForTests()
  resetColorSchemeForTests()
})
