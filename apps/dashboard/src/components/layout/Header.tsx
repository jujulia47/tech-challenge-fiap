'use client'

import { useRef, useState } from 'react'
import { signOut } from 'next-auth/react'
import { MenuDrawer } from '@/components/layout/MenuDrawer'
import { ProfileMenu } from '@/components/ui/ProfileMenu'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useUser } from '@/hooks/use-user'

export function Header() {
  const user = useUser()
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false)
  const avatarRef = useRef<HTMLButtonElement>(null)

  async function handleLogout() {
    await signOut({ redirect: false })
    window.location.href = process.env.NEXT_PUBLIC_SHELL_URL ?? 'http://localhost:3000'
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
          onLogout={() => setIsLogoutModalOpen(true)}
          triggerRef={avatarRef}
        />

        <Modal
          isOpen={isLogoutModalOpen}
          onClose={() => setIsLogoutModalOpen(false)}
          title="Sair da conta"
        >
          <p className="text-body text-text-primary mb-6">
            Tem certeza que deseja sair?
          </p>
          <div className="flex gap-4">
            <Button variant="light" label="Cancelar" onClick={() => setIsLogoutModalOpen(false)} fullWidth />
            <Button variant="accent" label="Sair" onClick={handleLogout} fullWidth />
          </div>
        </Modal>
      </div>
    </header>
  )
}
