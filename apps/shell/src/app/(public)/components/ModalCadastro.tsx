'use client'

import { useState } from 'react'
import { Button, Input, Checkbox, Modal, PasswordField } from '@bytebank/design-system'
import { passwordErrorMessage } from '@/lib/passwordErrors'

interface ModalCadastroProps {
  isOpen: boolean
  onClose: () => void
}

export function ModalCadastro({ isOpen, onClose }: ModalCadastroProps) {
  const [name, setName]                   = useState('')
  const [email, setEmail]                 = useState('')
  const [password, setPassword]           = useState('')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [termsError, setTermsError]       = useState('')
  const [error, setError]                 = useState('')
  const [submitted, setSubmitted]         = useState(false)
  const [refusedAsCommon, setRefusedAsCommon] = useState('')

  function handleClose() {
    setName('')
    setEmail('')
    setPassword('')
    setTermsAccepted(false)
    setTermsError('')
    setError('')
    setSubmitted(false)
    onClose()
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!termsAccepted) {
      setTermsError('Aceite os termos para continuar')
      return
    }
    setTermsError('')
    setError('')

    const response = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    }).catch(() => null)

    if (response?.status === 400) {
      setError('Verifique os dados.')
      return
    }
    if (response?.status === 422) {
      const code = await response.json().then((body: { error?: unknown }) => body.error, () => null)
      if (code === 'PASSWORD_TOO_COMMON') setRefusedAsCommon(password)
      setError(passwordErrorMessage(code) ?? 'Verifique os dados.')
      return
    }
    if (response?.status === 429) {
      setError('Muitas tentativas. Aguarde alguns minutos e tente novamente.')
      return
    }
    if (!response?.ok) {
      setError('Não foi possível concluir agora. Tente novamente.')
      return
    }
    setPassword('')
    setSubmitted(true)
  }

  // The same text for a new email and a registered one, so the screen does not tell them apart
  if (submitted) {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} title="Criar conta">
        <div className="flex flex-col gap-4 mt-6">
          <p role="status" className="text-meta text-primary-900">
            Cadastro recebido. Se este e-mail puder ser usado, sua conta está pronta: entre com seu e-mail e senha.
          </p>
          <Button variant="success" label="Fechar" onClick={handleClose} fullWidth />
        </div>
      </Modal>
    )
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
        <PasswordField
          label="Senha"
          value={password}
          onChange={setPassword}
          context={{ name, email }}
          refusedAsCommon={password !== '' && password === refusedAsCommon}
          required
        />
        <Checkbox
          label="Aceito os termos de uso e política de privacidade"
          checked={termsAccepted}
          onChange={setTermsAccepted}
          error={termsError}
        />

        {error && (
          <span className="text-meta text-error" role="alert" aria-live="polite">
            {error}
          </span>
        )}

        <Button type="submit" variant="success" label="Criar conta" fullWidth />
      </form>
    </Modal>
  )
}
