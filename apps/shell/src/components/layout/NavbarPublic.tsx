'use client'

import { useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils/cn'

interface NavbarPublicProps {
  onLoginClick?: () => void
  onSignupClick?: () => void
}

export function NavbarPublic({ onLoginClick, onSignupClick }: NavbarPublicProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <nav className="bg-primary-900 h-16 px-6 flex items-center justify-between relative">

      <button
        type="button"
        className="md:hidden text-inverse"
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label="Abrir menu"
        aria-expanded={menuOpen}
        aria-controls="navbar-mobile-menu"
      >
        <span className="material-icons text-icon-md">menu</span>
      </button>

      <Link
        href="/"
        className="absolute left-1/2 -translate-x-1/2 md:static md:translate-x-0 flex items-center gap-2 text-body-semibold text-inverse"
      >
        <span className="material-icons text-icon-sm">account_balance</span>
        Bytebank
      </Link>

      <div className="hidden md:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
        <Link href="/sobre" className="text-body text-inverse hover:opacity-80 transition-opacity">
          Sobre
        </Link>
        <Link href="#servicos" className="text-body text-inverse hover:opacity-80 transition-opacity">
          Serviços
        </Link>
      </div>

      <div className="hidden md:flex items-center gap-4 ml-auto">
        <button
          type="button"
          onClick={onSignupClick}
          className="h-12 px-6 rounded-md border text-body-semibold bg-public-accent text-inverse border-public-accent hover:opacity-90 active:scale-95 transition-all"
        >
          Abrir minha conta
        </button>
        <button
          type="button"
          onClick={onLoginClick}
          className="h-12 px-6 rounded-md border text-body-semibold bg-primary-900 text-inverse border-inverse hover:opacity-90 active:scale-95 transition-all"
        >
          Já tenho conta
        </button>
      </div>

      {menuOpen && (
        <div
          id="navbar-mobile-menu"
          className={cn(
            'absolute top-16 left-0 right-0 z-50 bg-primary-900 px-6 py-4',
            'flex flex-col gap-4 md:hidden'
          )}
        >
          <Link
            href="/sobre"
            className="text-body text-inverse hover:opacity-80"
            onClick={() => setMenuOpen(false)}
          >
            Sobre
          </Link>
          <Link
            href="#servicos"
            className="text-body text-inverse hover:opacity-80"
            onClick={() => setMenuOpen(false)}
          >
            Serviços
          </Link>
          <button
            type="button"
            onClick={() => { setMenuOpen(false); onSignupClick?.() }}
            className="h-12 px-6 rounded-md border text-body-semibold bg-public-accent text-inverse border-public-accent hover:opacity-90 active:scale-95 transition-all w-full"
          >
            Abrir minha conta
          </button>
          <button
            type="button"
            onClick={() => { setMenuOpen(false); onLoginClick?.() }}
            className="h-12 px-6 rounded-md border text-body-semibold bg-transparent text-inverse border-inverse hover:opacity-90 active:scale-95 transition-all w-full"
          >
            Já tenho conta
          </button>
        </div>
      )}
    </nav>
  )
}
