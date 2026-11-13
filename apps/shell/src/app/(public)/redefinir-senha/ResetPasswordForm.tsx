'use client'

import { useEffect, useState } from 'react'
import { ShellApiError, createShellClient } from '@bytebank/bff/client'
import { Button, Link, PasswordField } from '@bytebank/design-system'
import { passwordErrorMessage } from '@bytebank/utils'

const shell = createShellClient()

interface ResetPasswordFormProps {
  token: string
}

type Status = 'editing' | 'done' | 'invalid'

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [refusedAsCommon, setRefusedAsCommon] = useState('')
  const [status, setStatus] = useState<Status>(token ? 'editing' : 'invalid')

  // The token leaves the address bar, the history and any later Referer as soon as the page opens
  useEffect(() => {
    window.history.replaceState(null, '', '/redefinir-senha')
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')

    // No answer at all has no code, and gets the generic message below
    let code: string | null = null
    try {
      await shell.confirmPasswordReset(token, password)
      setStatus('done')
      return
    } catch (caught) {
      if (caught instanceof ShellApiError) code = caught.code
    }
    if (code === 'INVALID_RESET_TOKEN') {
      setStatus('invalid')
      return
    }
    if (code === 'PASSWORD_TOO_COMMON') setRefusedAsCommon(password)
    setError(passwordErrorMessage(code) ?? 'Não foi possível concluir agora. Tente novamente.')
  }

  if (status === 'done') {
    return (
      <>
        <h1 className="text-heading font-bold text-text-primary">Senha alterada</h1>
        <p role="status" className="text-body text-text-secondary">
          Sua nova senha já vale. Entre com ela para acessar sua conta.
        </p>
        <Link href="/" context="public" size="body" className="self-start">
          Voltar ao início e entrar
        </Link>
      </>
    )
  }

  if (status === 'invalid') {
    return (
      <>
        <h1 className="text-heading font-bold text-text-primary">Link inválido</h1>
        <p role="alert" aria-live="polite" className="text-body text-text-secondary">
          Este link expirou, já foi usado ou não é válido.
        </p>
        <Link href="/forgot-password" context="public" size="body" className="self-start">
          Pedir um novo link
        </Link>
      </>
    )
  }

  return (
    <>
      <div>
        <h1 className="text-heading font-bold text-text-primary mb-2">Criar nova senha</h1>
        <p className="text-body text-text-secondary">Use uma frase longa, fácil de lembrar e difícil de adivinhar.</p>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <PasswordField
          label="Nova senha"
          value={password}
          onChange={setPassword}
          refusedAsCommon={password !== '' && password === refusedAsCommon}
          required
        />
        {error && (
          <span className="text-meta text-error" role="alert" aria-live="polite">
            {error}
          </span>
        )}
        <Button type="submit" variant="success" label="Salvar nova senha" fullWidth />
      </form>
    </>
  )
}
