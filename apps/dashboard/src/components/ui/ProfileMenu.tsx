'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface ProfileMenuProps {
  isOpen: boolean
  onClose: () => void
  onLogout: () => void
  triggerRef: React.RefObject<HTMLElement | null>
  pathname?: string
}

const NAV_ITEMS = [
  { label: 'Minha conta',   href: '/account' },
  { label: 'Configurações', href: '/coming-soon' },
] as const

export function ProfileMenu({ isOpen, onClose, onLogout, triggerRef, pathname }: ProfileMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const currentPath = usePathname()
  const activePath = pathname ?? currentPath

  useEffect(() => {
    if (!isOpen) return
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      if (menuRef.current?.contains(target)) return
      if (triggerRef.current?.contains(target)) return
      onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isOpen, onClose, triggerRef])

  if (!isOpen) return null

  return (
    <div
      ref={menuRef}
      className="absolute top-12 right-0 z-50 bg-surface-dark rounded-md w-40 py-2 shadow-lg"
    >
      <div className="flex justify-end px-3 pb-1">
        <button
          type="button"
          onClick={onClose}
          className="text-success text-body-semibold leading-none hover:opacity-70 transition-opacity"
          aria-label="Fechar menu"
        >
          ×
        </button>
      </div>

      {NAV_ITEMS.map((item) => (
        <div key={item.label}>
          <Link
            href={item.href}
            onClick={onClose}
            className={[
              'block px-4 py-2 hover:opacity-80 transition-opacity',
              activePath === item.href
                ? 'text-body-semibold text-success'
                : 'text-body text-inverse',
            ].join(' ')}
          >
            {item.label}
          </Link>
          <div className="border-b border-inverse/30 mx-4" />
        </div>
      ))}

      <button
        type="button"
        onClick={() => { onClose(); onLogout() }}
        className="block w-full text-left px-4 py-2 text-body text-inverse hover:opacity-80 transition-opacity"
      >
        Sair
      </button>
    </div>
  )
}
