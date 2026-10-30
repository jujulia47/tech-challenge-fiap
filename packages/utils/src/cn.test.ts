import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { cn } from './cn'

const TYPOGRAPHY_TOKENS = [
  'text-meta',
  'text-meta-semibold',
  'text-body',
  'text-body-semibold',
  'text-nav',
  'text-nav-bold',
  'text-label',
  'text-heading',
  'text-display',
  'text-icon-xs',
  'text-icon-sm',
  'text-icon-md',
]

const COLOR_TOKENS = [
  'text-text-primary',
  'text-text-secondary',
  'text-inverse',
  'text-success',
  'text-error',
  'text-accent',
  'text-public-accent',
  'text-primary-900',
  'text-primary-800',
  'text-primary-50',
]

describe('cn', () => {
  it('joins class names with a single space', () => {
    expect(cn('flex', 'items-center', 'gap-2')).toBe('flex items-center gap-2')
  })

  it('returns an empty string when called without arguments', () => {
    expect(cn()).toBe('')
  })

  it('drops falsy values', () => {
    expect(cn('flex', false, null, undefined, 0, '', 'gap-2')).toBe('flex gap-2')
  })

  it('supports conditional objects and nested arrays (clsx syntax)', () => {
    expect(cn({ 'w-full': true, 'min-w-36': false }, ['h-12', ['px-6']])).toBe('w-full h-12 px-6')
  })

  it('collapses extra whitespace', () => {
    expect(cn('  flex   gap-2  ')).toBe('flex gap-2')
  })

  it('keeps exact duplicates of a class that has no conflict group', () => {
    expect(cn('toast-progress', 'toast-progress')).toBe('toast-progress toast-progress')
  })

  describe('Tailwind conflict resolution (tailwind-merge)', () => {
    it('keeps the last class of a standard conflicting group', () => {
      expect(cn('px-2', 'px-4')).toBe('px-4')
      expect(cn('rounded-md', 'rounded-lg')).toBe('rounded-lg')
    })

    it('treats design-system color tokens as colors and keeps the last one', () => {
      expect(cn('bg-primary-900', 'bg-success')).toBe('bg-success')
      expect(cn('border-primary-900', 'border-error')).toBe('border-error')
    })

    it('keeps a custom width token next to a standard width class', () => {
      expect(cn('w-card-sm', 'w-full')).toBe('w-card-sm w-full')
    })

    // Fixed in step 1.4a: design system typography tokens are registered in tailwind-merge
    it('keeps a custom typography token when a text color follows it', () => {
      // Button: base 'text-body-semibold' + variant 'text-inverse'
      expect(cn('text-body-semibold', 'text-inverse')).toBe('text-body-semibold text-inverse')
      // Select: 'text-body' + 'text-primary-800'
      expect(cn('text-body', 'text-primary-800')).toBe('text-body text-primary-800')
      // Error messages: 'text-meta' + 'text-error'
      expect(cn('text-meta', 'text-error')).toBe('text-meta text-error')
    })

    // Fixed in step 1.4a: design system typography tokens are registered in tailwind-merge
    it('keeps a custom icon size token when a text color follows it', () => {
      expect(cn('text-icon-sm', 'text-success')).toBe('text-icon-sm text-success')
    })

    // Fixed in step 1.4a: design system typography tokens are registered in tailwind-merge
    it('treats two custom typography tokens as font sizes and keeps the last one', () => {
      expect(cn('text-body', 'text-meta')).toBe('text-meta')
    })

    // Fixed in step 1.4a: design system typography tokens are registered in tailwind-merge
    it('treats a custom typography token and a standard font size as conflicting', () => {
      expect(cn('text-heading', 'text-sm')).toBe('text-sm')
    })

    it('keeps the last of two text colors', () => {
      expect(cn('text-success', 'text-inverse')).toBe('text-inverse')
      expect(cn('text-text-primary', 'text-text-secondary')).toBe('text-text-secondary')
      expect(cn('text-primary-800', 'text-error')).toBe('text-error')
    })

    it('keeps conditional variants of a token apart', () => {
      expect(cn('text-body', 'md:text-heading')).toBe('text-body md:text-heading')
    })
  })

  describe('typography tokens', () => {
    it('lists exactly the typography utilities defined in globals.css', () => {
      const css = readFileSync(new URL('../../../apps/shell/src/styles/globals.css', import.meta.url), 'utf8')
      const defined = [...css.matchAll(/^\s*\.(text-[a-z-]+)\s*\{\s*font-size:/gm)].map(match => match[1])

      expect([...defined].sort()).toEqual([...TYPOGRAPHY_TOKENS].sort())
    })

    describe.each(TYPOGRAPHY_TOKENS)('%s', token => {
      it('survives every text color, in both orders', () => {
        for (const color of COLOR_TOKENS) {
          expect(cn(token, color)).toBe(`${token} ${color}`)
          expect(cn(color, token)).toBe(`${color} ${token}`)
        }
      })

      it('is replaced by a later typography token', () => {
        const other = token === 'text-body' ? 'text-meta' : 'text-body'

        expect(cn(token, other)).toBe(other)
      })
    })
  })

  describe('color tokens', () => {
    it.each(COLOR_TOKENS)('%s stays in the color group', color => {
      expect(cn(color, 'text-inverse')).toBe('text-inverse')
    })
  })
})
