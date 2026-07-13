'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

interface CardAccountProps {
  initialName: string
  initialEmail: string
}

export function CardAccount({ initialName, initialEmail }: CardAccountProps) {
  const [name, setName]         = useState(initialName)
  const [email, setEmail]       = useState(initialEmail)
  const [password, setPassword] = useState('••••••••')

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
