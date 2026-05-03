'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MenuDrawer } from '@/components/layout/MenuDrawer'
import { ProfileMenu } from '@/components/ui/ProfileMenu'
import { useUser } from '@/hooks/use-user'

export function Header() {
  const user = useUser()
  const router = useRouter()
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const avatarRef = useRef<HTMLButtonElement>(null)

  function handleLogout() {
    router.push('/')
  }

  return (
    <header className="h-24 bg-primary-900 px-6 flex items-center justify-between shrink-0">
      <MenuDrawer />

      <div className="flex items-center gap-2 ml-auto relative">
        <span className="hidden md:block text-meta-semibold text-inverse">{user.name}</span>

        <button
          ref={avatarRef}
          type="button"
          onClick={() => setIsProfileMenuOpen((prev) => !prev)}
          className="w-10 h-10 rounded-full border border-accent flex items-center justify-center"
          aria-label="Abrir menu de perfil"
          aria-expanded={isProfileMenuOpen}
        >
          <span className="material-icons text-icon-md text-accent">account_circle</span>
        </button>

        <ProfileMenu
          isOpen={isProfileMenuOpen}
          onClose={() => setIsProfileMenuOpen(false)}
          onLogout={handleLogout}
          triggerRef={avatarRef}
        />
      </div>
    </header>
  )
}
