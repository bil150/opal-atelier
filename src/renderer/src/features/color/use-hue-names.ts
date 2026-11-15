import { useTranslation } from 'react-i18next'
import { HueRank, hueSlot, type WheelMode } from '@renderer/lib/color-theory'

export interface HueName {
  readonly name: string
  /** "primary", "secondary"… when the angle sits exactly on a named hue. */
  readonly rank: string
}

/** Names of the 12 hues of each wheel, in the current language. */
export function useHueNames(mode: WheelMode): (angle: number) => HueName {
  const { t } = useTranslation()
  const names = t(`color.hues.${mode}`, { returnObjects: true })
  const ranks: Record<HueRank, string> = {
    [HueRank.Primary]: t('color.ranks.primary'),
    [HueRank.Secondary]: t('color.ranks.secondary'),
    [HueRank.Tertiary]: t('color.ranks.tertiary'),
  }
  return (angle) => {
    const slot = hueSlot(angle)
    return { name: names[slot.index] ?? '', rank: slot.rank ? ranks[slot.rank] : '' }
  }
}
