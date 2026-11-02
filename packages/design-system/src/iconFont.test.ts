import { readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = resolve(__dirname, '../../..')
const FONTS = join(ROOT, 'packages/design-system/fonts')
const REGENERATE = [
  'The icon font is a subset. Add the name to packages/design-system/fonts/icons.txt and generate it again,',
  'with the command in the "Icon font" section of docs/fase4/performance.md.',
].join(' ')

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    if (['node_modules', '.next', '.turbo', 'storybook-static'].includes(entry.name)) return []
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return sourceFiles(path)
    return /\.tsx?$/.test(entry.name) && !/\.(test|stories)\.tsx?$/.test(entry.name) ? [path] : []
  })
}

const readList = (name: string) =>
  readFileSync(join(FONTS, name), 'utf8').split(/\r?\n/).map(line => line.trim()).filter(Boolean).sort()

// Icons are written as text in a span, as values in a data list, or as a suffixIcon
function iconsIn(source: string): string[] {
  const inSpans = [...source.matchAll(/className="material-icons[^"]*"[^>]*>([^<]*)</g)].flatMap(([, content]) => {
    const name = content.trim()
    return name.startsWith('{') ? [...name.matchAll(/[?:]\s*'([a-z_0-9]+)'/g)].map(match => match[1]) : [name]
  })
  const inData = [...source.matchAll(/\bicon: '([a-z_0-9]+)'/g)].map(match => match[1])
  const inProps = [...source.matchAll(/suffixIcon="([a-z_0-9]+)"/g)].map(match => match[1])
  return [...inSpans, ...inData, ...inProps].filter(Boolean)
}

const used = [...new Set(
  [join(ROOT, 'apps'), join(ROOT, 'packages')].flatMap(sourceFiles).flatMap(file => iconsIn(readFileSync(file, 'utf8'))),
)].sort()

describe('icon font', () => {
  it('finds the icons in the code', () => {
    expect(used).toEqual(expect.arrayContaining(['account_circle', 'arrow_drop_down', 'visibility_off', 'swap_horiz']))
  })

  it('has every icon used by the apps', () => {
    const listed = readList('icons.txt')
    const missing = used.filter(icon => !listed.includes(icon))

    expect(missing, REGENERATE).toEqual([])
  })

  it('was generated from the current list', () => {
    expect(readList('icons.built.txt'), REGENERATE).toEqual(readList('icons.txt'))
  })
})
