'use client'

import NextLink from 'next/link'
import { cn } from '@/lib/utils/cn'

interface LinkProps {
  href: string
  children: React.ReactNode
  context?: 'app' | 'public'
  size?: 'body' | 'meta'
  className?: string
  onClick?: () => void
}

export function Link({ href, children, context = 'app', size = 'body', className, onClick }: LinkProps) {
  const colorClass = context === 'public' ? 'text-public-accent' : 'text-success'
  const sizeClass  = size === 'meta' ? 'text-meta' : 'text-body'

  return (
    <NextLink
      href={href}
      onClick={onClick}
      className={cn(
        colorClass,
        sizeClass,
        'hover:opacity-80 transition-opacity',
        className,
      )}
    >
      {children}
    </NextLink>
  )
}
