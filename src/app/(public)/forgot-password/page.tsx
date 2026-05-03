'use client'

import { useState } from 'react'
import { PublicShell } from '@/components/layout/PublicShell'
import { Link } from '@/components/ui/Link'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(e: React.SubmitEvent ) {
    e.preventDefault()
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
                  Informe seu e-mail cadastrado. Enviaremos as instruções para redefinir sua senha.
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
                <Button type="submit" variant="success" label="Enviar instruções" fullWidth />
              </form>

              <Link href="/" context="public" size="body" className="self-start">
                Voltar ao início
              </Link>
            </>
          ) : (
            <>
              <div className="flex flex-col items-center gap-4 text-center">
                {/* text-icon-xl (48px) não existe como token DS — exceção documentada no skill-forgot-password.md */}
                <span className="material-icons text-success" style={{ fontSize: 48 }}>
                  mark_email_read
                </span>
                <h2 className="text-heading font-bold text-text-primary">
                  E-mail enviado!
                </h2>
                <p className="text-body text-text-secondary">
                  Se o endereço <strong>{email}</strong> estiver cadastrado,
                  você receberá as instruções em breve. Verifique também sua caixa de spam.
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
