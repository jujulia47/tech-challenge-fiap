'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Checkbox } from '@/components/ui/Checkbox'
import { Modal } from '@/components/ui/Modal'

interface ModalCadastroProps {
  isOpen: boolean
  onClose: () => void
}

export function ModalCadastro({ isOpen, onClose }: ModalCadastroProps) {
  const router = useRouter()
  const [name, setName]                   = useState('')
  const [email, setEmail]                 = useState('')
  const [password, setPassword]           = useState('')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [termsError, setTermsError]       = useState('')

  function handleClose() {
    setName('')
    setEmail('')
    setPassword('')
    setTermsAccepted(false)
    setTermsError('')
    onClose()
  }

  function handleSubmit(e: React.SubmitEvent ) {
    e.preventDefault()
    if (!termsAccepted) {
      setTermsError('Aceite os termos para continuar')
      return
    }
    setTermsError('')
    onClose()
    router.push('/dashboard')
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Criar conta">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-6">
        <Input
          label="Nome completo"
          type="text"
          placeholder="Joana da Silva"
          value={name}
          onChange={setName}
          required
          autoFocus
        />
        <Input
          label="E-mail"
          type="email"
          placeholder="seu@email.com"
          value={email}
          onChange={setEmail}
          required
        />
        <Input
          label="Senha"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={setPassword}
          required
        />
        <Checkbox
          label="Aceito os termos de uso e política de privacidade"
          checked={termsAccepted}
          onChange={setTermsAccepted}
          error={termsError}
        />

        <Button type="submit" variant="success" label="Criar conta" fullWidth />
      </form>
    </Modal>
  )
}
