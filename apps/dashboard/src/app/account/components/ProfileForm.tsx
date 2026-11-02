'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { USER_NAME_MAX_LENGTH } from '@bytebank/core'
import { Button, Input } from '@bytebank/design-system'
import { errorCodeOf } from '@/app/account/components/accountErrors'
import { useUpdateProfileMutation } from '@/store/transactionsApi'

interface ProfileFormProps {
  initialName: string
  email: string
  onSuccess: (message: string) => void
  onError: (message: string) => void
}

const NAME_ERROR = `Informe um nome de 1 a ${USER_NAME_MAX_LENGTH} caracteres`
const INVALID_NAME_CODES = ['VALIDATION_ERROR', 'USER_INVALID_NAME']

export function ProfileForm({ initialName, email, onSuccess, onError }: ProfileFormProps) {
  const [name, setName] = useState(initialName)
  const [error, setError] = useState('')
  const [updateProfile, { isLoading }] = useUpdateProfileMutation()
  const { update } = useSession()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    // Checked here for a quick answer; the server checks again with the same rule
    if (name.trim() === '' || [...name.trim()].length > USER_NAME_MAX_LENGTH) {
      setError(NAME_ERROR)
      return
    }
    try {
      const saved = await updateProfile(name).unwrap()
      setName(saved.name)
      // Without data, update() only reads the session. With any data it asks for a new token,
      // and the server reads the name from the store: what is sent here is ignored.
      await update({})
      onSuccess('Nome atualizado com sucesso')
    } catch (caught) {
      if (INVALID_NAME_CODES.includes(errorCodeOf(caught) ?? '')) setError(NAME_ERROR)
      else onError('Não foi possível salvar o nome. Tente novamente.')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" aria-labelledby="profile-title">
      <h3 id="profile-title" className="text-label text-text-primary">Dados pessoais</h3>
      <Input
        label="Nome"
        placeholder="Seu nome completo"
        value={name}
        onChange={setName}
        error={error}
        autoComplete="name"
        required
      />
      <Input
        label="E-mail"
        type="email"
        value={email}
        onChange={() => undefined}
        hint="O e-mail é o seu login e não pode ser alterado por aqui."
        disabled
      />
      <div>
        <Button type="submit" variant="success" label={isLoading ? 'Salvando...' : 'Salvar nome'} disabled={isLoading} />
      </div>
    </form>
  )
}
