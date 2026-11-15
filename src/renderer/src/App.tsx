import { Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import { ColorPage, GlossaryPage, ImageStudyPage, MannequinPage, SettingsPage } from '@renderer/lazy-pages'
import { HomePage } from '@renderer/pages/HomePage'
import { AppRoute } from '@renderer/routes'

export function App() {
  return (
    <Suspense fallback={null}>
      <Routes>
        <Route path={AppRoute.Home} element={<HomePage />} />
        <Route path={AppRoute.Glossary} element={<GlossaryPage />} />
        <Route path={`${AppRoute.Glossary}/:termId`} element={<GlossaryPage />} />
        <Route path={AppRoute.ImageStudy} element={<ImageStudyPage />} />
        <Route path={`${AppRoute.ImageStudy}/:section`} element={<ImageStudyPage />} />
        <Route path={AppRoute.Color} element={<ColorPage />} />
        <Route path={`${AppRoute.Color}/:section`} element={<ColorPage />} />
        <Route path={AppRoute.Mannequin} element={<MannequinPage />} />
        <Route path={`${AppRoute.Mannequin}/:section`} element={<MannequinPage />} />
        <Route path={AppRoute.Settings} element={<SettingsPage />} />
        <Route path="*" element={<Navigate to={AppRoute.Home} replace />} />
      </Routes>
    </Suspense>
  )
}
