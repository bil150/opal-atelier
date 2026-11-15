import { describe, expect, it } from 'vitest'
import {
  BodyShape,
  DEFAULT_SETTINGS,
  LIGHT_ANGLES,
  LightPreset,
  MannequinSection,
  Material,
  Shading,
  VIEW_ANGLES,
  ViewPreset,
  isMannequinSection,
  sanitizeSettings,
} from './mannequin-settings'

describe('sanitizeSettings', () => {
  it('starts from the original defaults: wood, smooth, light from the left', () => {
    expect(sanitizeSettings(null)).toEqual(DEFAULT_SETTINGS)
    expect(DEFAULT_SETTINGS).toMatchObject({
      heads: 7.5,
      lightAzimuth: 300,
      lightElevation: 40,
      duration: 60,
    })
  })

  it('keeps valid values and repairs the others field by field', () => {
    expect(
      sanitizeSettings({
        heads: 8.2,
        lightAzimuth: 500,
        lightElevation: 1,
        shading: Shading.TwoTones,
        shadow: 'yes',
        material: Material.Grey,
        shape: BodyShape.Female,
        duration: 45,
        session: false,
      }),
    ).toEqual({
      ...DEFAULT_SETTINGS,
      heads: 8,
      lightAzimuth: 360,
      lightElevation: 5,
      shading: Shading.TwoTones,
      material: Material.Grey,
      shape: BodyShape.Female,
      session: false,
    })
  })
})

describe('presets', () => {
  it('covers every view and light preset', () => {
    expect(Object.keys(VIEW_ANGLES)).toEqual(Object.values(ViewPreset))
    expect(Object.keys(LIGHT_ANGLES)).toEqual(Object.values(LightPreset))
    expect(LIGHT_ANGLES[LightPreset.Raking]).toEqual([90, 8])
  })

  it('recognises the sections', () => {
    expect(isMannequinSection(MannequinSection.Light)).toBe(true)
    expect(isMannequinSection('lumiere')).toBe(false)
  })
})
