import { describe, expect, it } from 'vitest'
import { resources } from '.'
import { Locale } from './locale'

interface Tree {
  readonly [key: string]: string | readonly string[] | Tree
}

/** Flattens nested translation objects into dotted keys: { a: { b: 'x' } } → ['a.b']. */
function keysOf(tree: Tree, prefix = ''): string[] {
  return Object.entries(tree).flatMap(([key, value]) =>
    typeof value === 'string'
      ? [`${prefix}${key}`]
      : Array.isArray(value)
        ? value.map((_, i) => `${prefix}${key}.${i}`)
        : keysOf(value as Tree, `${prefix}${key}.`),
  )
}

describe('translations', () => {
  const english = keysOf(resources[Locale.English].translation).sort()

  it.each(Object.values(Locale))('%s has exactly the same keys as English', (locale) => {
    expect(keysOf(resources[locale].translation).sort()).toEqual(english)
  })

  it.each(Object.values(Locale))('%s has no empty string', (locale) => {
    const tree: Tree = resources[locale].translation
    const empty = keysOf(tree).filter((key) => {
      const value = key
        .split('.')
        .reduce<string | readonly string[] | Tree | undefined>(
          (node, part) =>
            Array.isArray(node)
              ? (node as readonly string[])[Number(part)]
              : typeof node === 'object'
                ? (node as Tree)[part]
                : undefined,
          tree,
        )
      return typeof value === 'string' && value.trim() === ''
    })
    expect(empty).toEqual([])
  })
})
