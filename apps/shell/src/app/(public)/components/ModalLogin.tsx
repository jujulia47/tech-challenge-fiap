'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
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
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  function handleClose() {
    setEmail('')
    setPassword('')
    setError('')
    onClose()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    if (result?.error) {
      setError('E-mail ou senha inválidos.')
      return
    }

    onClose()
    router.push('/dashboard')
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Login">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-6">
        <Input
          label="E-mail"
          type="email"
          placeholder="seu@email.com"
          value={email}
          onChange={setEmail}
          required
          autoFocus
        />
        <Input
          label="Senha"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={setPassword}
          required
        />

        {error && (
          <span className="text-meta text-error" role="alert">
            {error}
          </span>
        )}

        <Link href="/forgot-password" context="public" size="meta" className="self-start" onClick={handleClose}>
          Esqueci a senha!
        </Link>

        <Button type="submit" variant="success" label="Entrar" fullWidth />
      </form>
    </Modal>
  )
}
