import { createElement, type ComponentProps } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { ProfileMenu } from './ProfileMenu'

vi.mock('next/navigation', () => ({ usePathname: () => '/account' }))

// Marks next/link in the output: both link types render an <a> otherwise
vi.mock('next/link', async () => {
  const { createElement: h } = await import('react')
  return { default: (props: ComponentProps<'a'>) => h('a', { ...props, 'data-next-link': '' }) }
})

function render(props: Partial<ComponentProps<typeof ProfileMenu>> = {}) {
  return renderToStaticMarkup(
    createElement(ProfileMenu, {
      isOpen: true,
      onClose: () => {},
      onLogout: () => {},
      triggerRef: { current: null },
      ...props,
    }),
  )
}

describe('ProfileMenu', () => {
  it('renders nothing when closed', () => {
    expect(render({ isOpen: false })).toBe('')
  })

  it('uses the shell links by default', () => {
    const html = render()

    expect(html).toContain('href="/dashboard/account"')
    expect(html).toContain('href="/dashboard/coming-soon"')
  })

  it('renders the given items instead of the default ones', () => {
    const html = render({ items: [{ label: 'Conta', href: '/account' }] })

    expect(html).toContain('href="/account"')
    expect(html).not.toContain('/dashboard/account')
    expect(html).toContain('Conta')
  })

  it('highlights the active item', () => {
    const html = render({ items: [{ label: 'Conta', href: '/account' }, { label: 'Outra', href: '/other' }] })

    expect(html).toMatch(/<a [^>]*class="[^"]*text-success[^"]*"[^>]*>Conta<\/a>/)
    expect(html).toMatch(/<a [^>]*class="[^"]*text-inverse[^"]*"[^>]*>Outra<\/a>/)
  })

  it('renders a next/link for items inside the zone', () => {
    const html = render({ items: [{ label: 'Conta', href: '/account' }] })

    expect(html).toContain('href="/account"')
    expect(html).toContain('data-next-link')
  })

  it('renders a plain anchor with the absolute path for cross-zone items', () => {
    const html = render({ items: [{ label: 'Conta', href: '/dashboard/account', crossZone: true }] })

    expect(html).toContain('href="/dashboard/account"')
    expect(html).not.toContain('data-next-link')
  })
})
