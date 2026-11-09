'use client'

import { useState } from 'react'
import { Button, PasswordField, PasswordInput, useUser } from '@bytebank/design-system'
import { passwordErrorMessage } from '@bytebank/utils'
import { errorCodeOf } from '@/app/account/components/accountErrors'
import { useChangePasswordMutation } from '@/store/transactionsApi'

interface PasswordFormProps {
  email: string
  onSuccess: (message: string) => void
  onError: (message: string) => void
}

export function PasswordForm({ email, onSuccess, onError }: PasswordFormProps) {
  const { name } = useUser()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [currentError, setCurrentError] = useState('')
  const [newError, setNewError] = useState('')
  const [refusedAsCommon, setRefusedAsCommon] = useState('')
  const [changePassword, { isLoading }] = useChangePasswordMutation()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setCurrentError('')
    setNewError('')
    try {
      await changePassword({ currentPassword, newPassword }).unwrap()
      setCurrentPassword('')
      setNewPassword('')
      onSuccess('Senha alterada com sucesso')
    } catch (caught) {
      const code = errorCodeOf(caught)
      if (code === 'INVALID_CURRENT_PASSWORD') return setCurrentError('Senha atual incorreta')
      if (code === 'RATE_LIMITED') return setCurrentError('Muitas tentativas. Aguarde alguns minutos e tente novamente.')
      if (code === 'PASSWORD_TOO_COMMON') setRefusedAsCommon(newPassword)
      const message = passwordErrorMessage(code)
      if (message) return setNewError(message)
      onError('Não foi possível alterar a senha. Tente novamente.')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" aria-labelledby="password-title">
      <h3 id="password-title" className="text-label text-text-primary">Alterar senha</h3>
      {/* The current password is typed, not created: no strength, filled by a password manager */}
      <PasswordInput
        label="Senha atual"
        value={currentPassword}
        onChange={setCurrentPassword}
        error={currentError}
        required
      />
      <PasswordField
        label="Nova senha"
        value={newPassword}
        onChange={setNewPassword}
        context={{ name, email }}
        refusedAsCommon={newPassword !== '' && newPassword === refusedAsCommon}
        error={newError}
        required
      />
      <div>
        <Button type="submit" variant="success" label={isLoading ? 'Salvando...' : 'Alterar senha'} disabled={isLoading} />
      </div>
    </form>
  )
}
