'use client'

import { useState } from 'react'
import { createShellClient } from '@bytebank/bff/client'
import { PublicShell } from '@/components/layout/PublicShell'
import { Link, Input, Button } from '@bytebank/design-system'

const shell = createShellClient()

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')

    try {
      await shell.requestPasswordReset(email)
    } catch {
      // The same message for a refusal and for no answer at all
      setError('Não foi possível concluir agora. Tente novamente.')
      return
    }
    setSubmitted(true)
  }

  return (
    <PublicShell>
      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-lg bg-surface-modal rounded-md p-8 flex flex-col gap-6">

          {!submitted ? (
            <>
              <div>
                <h1 className="text-heading font-bold text-text-primary mb-2">
                  Esqueci a senha
                </h1>
                <p className="text-body text-text-secondary">
                  Informe seu e-mail cadastrado. Enviaremos um link para criar uma nova senha.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <Input
                  label="E-mail"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={setEmail}
                  required
                />
                {error && (
                  <span className="text-meta text-error" role="alert" aria-live="polite">
                    {error}
                  </span>
                )}
                <Button type="submit" variant="success" label="Enviar link" fullWidth />
              </form>

              <Link href="/" context="public" size="body" className="self-start">
                Voltar ao início
              </Link>
            </>
          ) : (
            <>
              <div className="flex flex-col items-center gap-4 text-center">
                {/* text-icon-xl (48px) não existe como token DS — exceção documentada no skill-forgot-password.md */}
                <span className="material-icons text-success text-[48px]!" aria-hidden="true">
                  mark_email_read
                </span>
                <h2 className="text-heading font-bold text-text-primary">
                  Verifique seu e-mail
                </h2>
                <p role="status" className="text-body text-text-secondary">
                  Se o e-mail estiver cadastrado, enviamos um link. Verifique também sua caixa de spam.
                </p>
              </div>

              <Link href="/" context="public" size="body" className="text-center">
                Voltar ao início
              </Link>
            </>
          )}

        </div>
      </main>
    </PublicShell>
  )
}
