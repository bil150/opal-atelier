/**
 * The tools are loaded when first opened, so the home page doesn't wait for three.js (Mannequin) or the
 * image and colour engines. Each import is made once and shared.
 */
import { lazy } from 'react'

const loaders = {
  glossary: () => import('@renderer/features/glossary/GlossaryPage'),
  imageStudy: () => import('@renderer/features/image-study/ImageStudyPage'),
  color: () => import('@renderer/features/color/ColorPage'),
  mannequin: () => import('@renderer/features/mannequin/MannequinPage'),
  settings: () => import('@renderer/features/settings/SettingsPage'),
}

const cache = new Map<keyof typeof loaders, Promise<unknown>>()
function load<K extends keyof typeof loaders>(key: K): ReturnType<(typeof loaders)[K]> {
  let promise = cache.get(key)
  if (!promise) {
    promise = loaders[key]()
    cache.set(key, promise)
  }
  return promise as ReturnType<(typeof loaders)[K]>
}

export const GlossaryPage = lazy(() => load('glossary').then((m) => ({ default: m.GlossaryPage })))
export const ImageStudyPage = lazy(() => load('imageStudy').then((m) => ({ default: m.ImageStudyPage })))
export const ColorPage = lazy(() => load('color').then((m) => ({ default: m.ColorPage })))
export const MannequinPage = lazy(() => load('mannequin').then((m) => ({ default: m.MannequinPage })))
export const SettingsPage = lazy(() => load('settings').then((m) => ({ default: m.SettingsPage })))

/** Loads every tool (tests, or warming up once the home page is shown). */
export function loadAllPages(): Promise<unknown> {
  return Promise.all((Object.keys(loaders) as (keyof typeof loaders)[]).map(load))
}
