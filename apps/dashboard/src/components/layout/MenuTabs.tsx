'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils/cn'
import { NAV_ITEMS } from '@/components/layout/nav-items'

export function MenuTabs() {
  const pathname = usePathname()

  return (
    <nav
      className={cn(
        'hidden md:flex lg:hidden bg-bg-base',
      )}
    >
      <ul className="grid grid-cols-4 w-full">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === '/'
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(item.href + '/')

          const linkClassName = cn(
            'block py-4 text-center',
            isActive
              ? 'text-nav-bold text-success border-b border-success'
              : 'text-body text-text-primary',
          )

          return (
            <li key={item.href}>
              {item.external ? (
                <a href={item.href} className={linkClassName}>
                  {item.label}
                </a>
              ) : (
                <Link href={item.href} className={linkClassName}>
                  {item.label}
                </Link>
              )}
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
