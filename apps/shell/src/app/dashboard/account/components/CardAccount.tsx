'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useUser } from '@/hooks/use-user'

export function CardAccount() {
  const user = useUser()
  const [name, setName]         = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('••••••••')

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncs local form state with async user data from useUser hook
    if (user.name) setName(user.name)
    if (user.email) setEmail(user.email)
  }, [user.name, user.email])

  function handleSave() {
    // Save logic (future step)
  }

  return (
    <div className="relative bg-surface-form rounded-md p-6 overflow-hidden">
      <h2 className="text-heading text-text-primary mb-6">Minha conta</h2>

      <form onSubmit={(e) => { e.preventDefault(); handleSave() }} className="flex flex-col gap-4">
        <Input
          label="Nome"
          placeholder="Seu nome completo"
          value={name}
          onChange={setName}
          suffixIcon="edit"
        />
        <Input
          label="Email"
          type="email"
          placeholder="Seu email"
          value={email}
          onChange={setEmail}
          suffixIcon="edit"
        />
        <Input
          label="Senha"
          type="password"
          placeholder="Sua senha"
          value={password}
          onChange={setPassword}
          suffixIcon="edit"
        />

        <div className="mt-4">
          <Button
            type="submit"
            variant="success"
            label="Salvar alterações"
          />
        </div>
      </form>
    </div>
  )
}
