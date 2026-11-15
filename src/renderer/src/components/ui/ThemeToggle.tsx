import { useTranslation } from 'react-i18next'
import { ColorScheme, setColorScheme, shownColorScheme, useColorScheme } from '@renderer/theme/color-scheme'

const MOON = 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z'
const SUN = [
  'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
  'M12 2v2',
  'M12 20v2',
  'M4.9 4.9l1.4 1.4',
  'M17.7 17.7l1.4 1.4',
  'M2 12h2',
  'M20 12h2',
  'M4.9 19.1l1.4-1.4',
  'M17.7 6.3l1.4-1.4',
]

/** Flips between light and dark; the choice is remembered on this device (day by default; "device" is chosen in the settings). */
export function ThemeToggle() {
  const { t } = useTranslation()
  const isDark = shownColorScheme(useColorScheme()) === ColorScheme.Dark
  const label = isDark ? t('theme.toLight') : t('theme.toDark')

  const toggle = () => {
    const next = isDark ? ColorScheme.Light : ColorScheme.Dark
    setColorScheme(next)
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className="inline-grid size-9 flex-none place-items-center rounded-lg border border-line bg-paper-2 hover:border-ink"
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="size-[18px] fill-none stroke-current stroke-2 [stroke-linecap:round] [stroke-linejoin:round]"
      >
        {(isDark ? SUN : [MOON]).map((d) => (
          <path key={d} d={d} />
        ))}
      </svg>
    </button>
  )
}
