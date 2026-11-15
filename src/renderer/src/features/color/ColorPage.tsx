import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router'
import { PageShell } from '@renderer/components/layout/PageShell'
import { PageWidth } from '@renderer/components/layout/page-width'
import { StudioFrame, type StudioTab } from '@renderer/components/studio/StudioFrame'
import { STUDIO_LAYOUTS, StudioLayout } from '@renderer/components/studio/studio-options'
import { isOneOf, useLocalStorage } from '@renderer/hooks/use-local-storage'
import { AppRoute } from '@renderer/routes'
import { ColorSection, ColorTab, MixMode, isColorSection, lastMixMode } from './color-settings'
import { MixView } from './mix/MixView'
import { TemperatureView } from './temperature/TemperatureView'
import { TheoryView } from './theory/TheoryView'
import { WheelView } from './wheel/WheelView'

const TAB_ICONS: Readonly<Record<ColorTab, ReactNode>> = {
  [ColorTab.Wheel]: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v5M12 16v5M3 12h5M16 12h5" />
    </>
  ),
  [ColorTab.Mix]: (
    <>
      <path d="M8 3.5c2.6 3.2 4 5.4 4 7.2a4 4 0 0 1-8 0c0-1.8 1.4-4 4-7.2z" />
      <path d="M16 9.5c2.6 3.2 4 5.4 4 7.2a4 4 0 0 1-8 0c0-1.8 1.4-4 4-7.2z" />
    </>
  ),
  [ColorTab.Temperature]: (
    <>
      <path d="M10 13.5V5a2 2 0 0 1 4 0v8.5a4 4 0 1 1-4 0z" />
      <path d="M12 9v6" />
    </>
  ),
  [ColorTab.Theory]: (
    <>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" />
      <path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5" />
      <path d="M8 7h8M8 11h6" />
    </>
  ),
}

const TAB_OF_SECTION: Readonly<Record<ColorSection, ColorTab>> = {
  [ColorSection.Wheel]: ColorTab.Wheel,
  [ColorSection.Mix]: ColorTab.Mix,
  [ColorSection.Palette]: ColorTab.Mix,
  [ColorSection.Temperature]: ColorTab.Temperature,
  [ColorSection.Theory]: ColorTab.Theory,
}

/** Colour tool: wheel and harmonies, mixing simulator, temperature and neutrals, colour theory. */
export function ColorPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { section: param } = useParams()
  const section = isColorSection(param) ? param : ColorSection.Wheel
  const tab = TAB_OF_SECTION[section]
  const [layout, setLayout] = useLocalStorage('color:layout', StudioLayout.Above, isOneOf(STUDIO_LAYOUTS))

  const tabs: StudioTab<ColorTab>[] = Object.values(ColorTab).map((id) => ({
    id,
    label: t(`color.tabs.${id}`),
    icon: TAB_ICONS[id],
  }))
  const selectTab = (next: ColorTab) => {
    if (next === tab) return
    const section = next === ColorTab.Mix && lastMixMode() === MixMode.Palette ? ColorSection.Palette : next
    void navigate(`${AppRoute.Color}/${section}`, { replace: true })
  }

  return (
    <PageShell
      title={t('color.title')}
      breadcrumbs={[{ label: t('app.name'), to: AppRoute.Home }, { label: t('color.title') }]}
      width={PageWidth.Full}
    >
      <h1 className="sr-only">{t('color.title')}</h1>
      <StudioFrame tabs={tabs} activeTab={tab} onSelectTab={selectTab} layout={layout} onLayout={setLayout}>
        {tab === ColorTab.Wheel ? <WheelView layout={layout} /> : null}
        {tab === ColorTab.Mix ? (
          <MixView
            layout={layout}
            mode={section === ColorSection.Palette ? MixMode.Palette : MixMode.Single}
          />
        ) : null}
        {tab === ColorTab.Temperature ? <TemperatureView layout={layout} /> : null}
        {tab === ColorTab.Theory ? <TheoryView /> : null}
      </StudioFrame>
    </PageShell>
  )
}
