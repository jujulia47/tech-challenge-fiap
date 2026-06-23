'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Link } from '@/components/ui/Link'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'

interface ModalLoginProps {
  isOpen: boolean
  onClose: () => void
}

export function ModalLogin({ isOpen, onClose }: ModalLoginProps) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  function handleClose() {
    setName('')
    setEmail('')
    setPassword('')
    onClose()
  }

  function handleSubmit(e: React.SubmitEvent ) {
    e.preventDefault()
    localStorage.setItem('bytebank_user', JSON.stringify({ name, email }))
    onClose()
    router.push('/dashboard')
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Login">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-6">
        <Input
          label="Nome"
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

        <Link href="/forgot-password" context="public" size="meta" className="self-start" onClick={handleClose}>
          Esqueci a senha!
        </Link>

        <Button type="submit" variant="success" label="Entrar" fullWidth />
      </form>
    </Modal>
  )
}
