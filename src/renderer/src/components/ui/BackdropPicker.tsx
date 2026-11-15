import { useTranslation } from 'react-i18next'
import { BACKDROPS, BACKDROP_SWATCH, setBackdrop, useBackdrop } from '@renderer/theme/backdrop'

/** Every page theme, named, two by two (mobile menu). */
export function BackdropPicker() {
  const { t } = useTranslation()
  const backdrop = useBackdrop()
  return (
    <div
      role="group"
      aria-label={t('studio.backdrop')}
      className="grid w-full grid-cols-2 gap-0.5 rounded-lg border border-line bg-paper-2 p-0.5"
    >
      {BACKDROPS.map((option) => {
        const [paper, ink] = BACKDROP_SWATCH[option]
        const label = t(`studio.backdrops.${option}`)
        return (
          <button
            key={option}
            type="button"
            aria-pressed={option === backdrop}
            onClick={() => setBackdrop(option)}
            className="flex h-9 items-center gap-2 rounded-md px-2.5 text-left text-[13px] font-semibold text-muted hover:bg-highlight hover:text-ink aria-pressed:bg-ink/15 aria-pressed:text-ink aria-pressed:shadow-[inset_0_0_0_1.5px_var(--color-ink)]"
          >
            <svg viewBox="0 0 20 20" aria-hidden="true" className="size-[18px] flex-none">
              <circle cx="10" cy="10" r="8.5" fill={paper} stroke="currentColor" strokeWidth="1" />
              <path d="M10 1.5a8.5 8.5 0 0 1 0 17z" fill={ink} />
            </svg>
            {label}
          </button>
        )
      })}
    </div>
  )
}
