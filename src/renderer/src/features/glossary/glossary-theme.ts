/** Glossary sections, in display order. Labels live in the locales (glossary.themes.*). */
export enum GlossaryTheme {
  Colour = 'colour',
  Techniques = 'techniques',
  Materials = 'materials',
  SupportsAndTools = 'supports-and-tools',
  Drawing = 'drawing',
  Composition = 'composition',
  SubjectsAndGenres = 'subjects-and-genres',
}

export const GLOSSARY_THEMES: readonly GlossaryTheme[] = Object.values(GlossaryTheme)

export function isGlossaryTheme(value: unknown): value is GlossaryTheme {
  return typeof value === 'string' && (GLOSSARY_THEMES as readonly string[]).includes(value)
}
