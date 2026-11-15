/**
 * The most common colours on a painter's palette, in palette order. Common names and Colour Index
 * pigment codes only: generic, shared by every manufacturer, no brand. Shades are approximate.
 * "Primary" colours are those sold under that name for mixing: painter's yellow, red, blue
 * and printing magenta, cyan.
 */
import { Locale } from '@renderer/i18n/locale'

export enum PaintFamily {
  White = 'white',
  Primaries = 'primaries',
  YellowsAndOranges = 'yellows-and-oranges',
  RedsAndViolets = 'reds-and-violets',
  Blues = 'blues',
  Greens = 'greens',
  Earths = 'earths',
  GreysAndBlack = 'greys-and-black',
}

export interface GenericPaint {
  readonly id: string
  readonly family: PaintFamily
  readonly pigment: string
  readonly hex: string
  readonly name: Readonly<Record<Locale, string>>
}

function paint(
  family: PaintFamily,
  id: string,
  pigment: string,
  hex: string,
  en: string,
  fr: string,
): GenericPaint {
  return { id, family, pigment, hex, name: { [Locale.English]: en, [Locale.French]: fr } }
}

const F = PaintFamily

export const GENERIC_PAINTS: readonly GenericPaint[] = [
  paint(F.White, 'titanium-white', 'PW6', '#F5F4EF', 'Titanium white', 'Blanc de titane'),

  paint(F.Primaries, 'primary-yellow', 'PY74', '#F6D312', 'Primary yellow', 'Jaune primaire'),
  paint(F.Primaries, 'primary-red', 'PR254', '#D7262B', 'Primary red', 'Rouge primaire'),
  paint(F.Primaries, 'primary-blue', 'PB15:3', '#1A5FA8', 'Primary blue', 'Bleu primaire'),
  paint(F.Primaries, 'primary-magenta', 'PR122', '#C8287A', 'Primary magenta', 'Magenta primaire'),
  paint(F.Primaries, 'primary-cyan', 'PB15:3 + PW6', '#0E8FC6', 'Primary cyan', 'Cyan primaire'),

  paint(F.YellowsAndOranges, 'lemon-yellow', 'PY3', '#F3E23B', 'Lemon yellow', 'Jaune citron'),
  paint(
    F.YellowsAndOranges,
    'cadmium-yellow-light',
    'PY35',
    '#F6CF1A',
    'Cadmium yellow light',
    'Jaune de cadmium clair',
  ),
  paint(
    F.YellowsAndOranges,
    'cadmium-yellow-medium',
    'PY35',
    '#F5B30F',
    'Cadmium yellow medium',
    'Jaune de cadmium moyen',
  ),
  paint(F.YellowsAndOranges, 'yellow-ochre', 'PY43', '#C8913A', 'Yellow ochre', 'Ocre jaune'),
  paint(F.YellowsAndOranges, 'cadmium-orange', 'PO20', '#EC6A1E', 'Cadmium orange', 'Orange de cadmium'),

  paint(
    F.RedsAndViolets,
    'cadmium-red-light',
    'PR108',
    '#DC3B25',
    'Cadmium red light',
    'Rouge de cadmium clair',
  ),
  paint(
    F.RedsAndViolets,
    'cadmium-red-deep',
    'PR108',
    '#B42628',
    'Cadmium red deep',
    'Rouge de cadmium foncé',
  ),
  paint(F.RedsAndViolets, 'alizarin-crimson', 'PR83', '#8E1D33', 'Alizarin crimson', 'Alizarine cramoisie'),
  paint(
    F.RedsAndViolets,
    'quinacridone-magenta',
    'PR122',
    '#B8306E',
    'Quinacridone magenta',
    'Magenta de quinacridone',
  ),
  paint(F.RedsAndViolets, 'dioxazine-violet', 'PV23', '#4B2A5E', 'Dioxazine violet', 'Violet de dioxazine'),

  paint(F.Blues, 'ultramarine-blue', 'PB29', '#2E3F95', 'Ultramarine blue', 'Bleu outremer'),
  paint(F.Blues, 'cobalt-blue', 'PB28', '#2F5DA8', 'Cobalt blue', 'Bleu de cobalt'),
  paint(F.Blues, 'cerulean-blue', 'PB35', '#3D8CC4', 'Cerulean blue', 'Bleu céruléen'),
  paint(F.Blues, 'phthalo-blue', 'PB15:3', '#1B4E8C', 'Phthalo blue', 'Bleu de phtalocyanine'),
  paint(F.Blues, 'prussian-blue', 'PB27', '#1D2F4A', 'Prussian blue', 'Bleu de Prusse'),

  paint(F.Greens, 'phthalo-green', 'PG7', '#11685A', 'Phthalo green', 'Vert de phtalocyanine'),
  paint(F.Greens, 'viridian', 'PG18', '#1E6E5C', 'Viridian', 'Vert émeraude'),
  paint(F.Greens, 'chromium-oxide-green', 'PG17', '#607C45', 'Chromium oxide green', 'Vert oxyde de chrome'),

  paint(F.Earths, 'raw-sienna', 'PBr7', '#B5743A', 'Raw sienna', 'Terre de Sienne naturelle'),
  paint(F.Earths, 'burnt-sienna', 'PBr7', '#87442A', 'Burnt sienna', 'Terre de Sienne brûlée'),
  paint(F.Earths, 'english-red', 'PR101', '#9E3F2C', 'English red', 'Rouge anglais'),
  paint(F.Earths, 'raw-umber', 'PBr7', '#6C5A3F', 'Raw umber', 'Terre d’ombre naturelle'),
  paint(F.Earths, 'burnt-umber', 'PBr7', '#533A2B', 'Burnt umber', 'Terre d’ombre brûlée'),

  paint(F.GreysAndBlack, 'paynes-grey', 'PB29 + PBk9', '#3D4752', 'Payne’s grey', 'Gris de Payne'),
  paint(F.GreysAndBlack, 'ivory-black', 'PBk9', '#24221F', 'Ivory black', 'Noir d’ivoire'),
]

export const PAINT_FAMILIES: readonly PaintFamily[] = Object.values(PaintFamily)
