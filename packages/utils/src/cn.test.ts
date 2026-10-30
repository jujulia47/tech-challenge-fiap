import { describe, expect, it } from 'vitest'
import { cn } from './cn'

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

    // Characterization: current behavior, see docs/fase4/testing.md
    it('drops a custom typography token when a text color follows it', () => {
      // Button: base 'text-body-semibold' + variant 'text-inverse'
      expect(cn('text-body-semibold', 'text-inverse')).toBe('text-inverse')
      // Select: 'text-body' + 'text-primary-800'
      expect(cn('text-body', 'text-primary-800')).toBe('text-primary-800')
      // Error messages: 'text-meta' + 'text-error'
      expect(cn('text-meta', 'text-error')).toBe('text-error')
    })

    // Characterization: current behavior, see docs/fase4/testing.md
    it('drops a custom icon size token when a text color follows it', () => {
      expect(cn('text-icon-sm', 'text-success')).toBe('text-success')
    })

    // Characterization: current behavior, see docs/fase4/testing.md
    it('treats two custom typography tokens as conflicting and keeps the last one', () => {
      expect(cn('text-body', 'text-meta')).toBe('text-meta')
    })

    it('keeps a custom typography token next to a standard font size', () => {
      expect(cn('text-heading', 'text-sm')).toBe('text-heading text-sm')
    })
  })
})
