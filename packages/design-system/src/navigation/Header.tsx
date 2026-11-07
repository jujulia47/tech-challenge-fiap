'use client'

import { useRef, useState } from 'react'
import { Button } from '../Button'
import { useUser } from '../hooks/useUser'
import { Modal } from '../Modal'
import { ProfileMenu, type ProfileMenuItem } from '../ProfileMenu'
import { signOutCompletely } from '../session/zoneSession'
import { MenuDrawer } from './MenuDrawer'
import type { NavItem } from './navItems'

interface HeaderProps {
  navItems: readonly NavItem[]
  // Paths depend on the zone; without them, the profile menu uses absolute paths
  profileItems?: readonly ProfileMenuItem[]
}

export function Header({ navItems, profileItems }: HeaderProps) {
  const user = useUser()
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false)
  const avatarRef = useRef<HTMLButtonElement>(null)

  async function handleLogout() {
    await signOutCompletely()
    // The login is at the root of the shell, a full page load away from any zone
    window.location.href = '/'
  }

  return (
    <header className="h-24 bg-primary-900 px-6 flex items-center justify-between shrink-0">
      <MenuDrawer items={navItems} />

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
          <span className="material-icons text-icon-md text-accent" aria-hidden="true">account_circle</span>
        </button>

        <ProfileMenu
          items={profileItems}
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
