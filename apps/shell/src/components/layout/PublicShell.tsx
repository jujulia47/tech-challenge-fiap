'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'
import { NavbarPublic } from '@/components/layout/NavbarPublic'
import { ModalLogin } from '@/app/(public)/components/ModalLogin'
import { ModalCadastro } from '@/app/(public)/components/ModalCadastro'

type OpenModal = 'login' | 'signup' | null

interface PublicModalContextValue {
  openLogin: () => void
  openSignup: () => void
}

export const PublicModalContext = createContext<PublicModalContextValue>({
  openLogin: () => {},
  openSignup: () => {},
})

export function usePublicModal() {
  return useContext(PublicModalContext)
}

interface PublicShellProps {
  children: ReactNode
}

export function PublicShell({ children }: PublicShellProps) {
  const [openModal, setOpenModal] = useState<OpenModal>(null)

  const controls: PublicModalContextValue = {
    openLogin: () => setOpenModal('login'),
    openSignup: () => setOpenModal('signup'),
  }

  return (
    <PublicModalContext.Provider value={controls}>
      <NavbarPublic
        onLoginClick={controls.openLogin}
        onSignupClick={controls.openSignup}
      />
      {children}
      <ModalLogin
        isOpen={openModal === 'login'}
        onClose={() => setOpenModal(null)}
      />
      <ModalCadastro
        isOpen={openModal === 'signup'}
        onClose={() => setOpenModal(null)}
      />
    </PublicModalContext.Provider>
  )
}
