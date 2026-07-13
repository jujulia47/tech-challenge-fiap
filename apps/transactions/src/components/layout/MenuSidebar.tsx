'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils/cn'
import { NAV_ITEMS } from '@/components/layout/nav-items'

export function MenuSidebar() {
  const pathname = usePathname()

  return (
    <aside
      className={cn(
        'hidden lg:flex lg:flex-col w-sidebar bg-surface-card rounded-md shrink-0 self-stretch',
      )}
    >
      <nav className="flex flex-col pt-4">
        {NAV_ITEMS.map((item, idx) => {
          const isActive =
            item.href === '/'
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(item.href + '/')
          const isLast = idx === NAV_ITEMS.length - 1
          const linkClassName = cn(
            'py-4 text-center',
            isActive
              ? 'text-body font-bold text-success'
              : 'text-body text-text-primary hover:bg-text-primary/5 transition-colors',
          )

          return (
            <React.Fragment key={item.href}>
              {item.external ? (
                <a href={item.href} className={linkClassName}>
                  {item.label}
                </a>
              ) : (
                <Link href={item.href} className={linkClassName}>
                  {item.label}
                </Link>
              )}
              {!isLast && (
                <div
                  className={cn(
                    'border-t mx-6',
                    isActive ? 'border-success' : 'border-text-primary',
                  )}
                />
              )}
            </React.Fragment>
          )
        })}
      </nav>
    </aside>
  )
}
