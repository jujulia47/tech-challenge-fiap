import type { Metadata } from 'next'
import { PublicShell } from '@/components/layout/PublicShell'
import { ResetPasswordForm } from '@/app/(public)/redefinir-senha/ResetPasswordForm'

export const metadata: Metadata = {
  title: 'Redefinir senha',
  description: 'Crie uma nova senha para acessar sua conta do Bytebank.',
}

interface ResetPasswordPageProps {
  searchParams: Promise<{ token?: string | string[] }>
}

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const { token } = await searchParams

  return (
    <PublicShell>
      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-lg bg-surface-modal rounded-md p-8 flex flex-col gap-6">
          <ResetPasswordForm token={typeof token === 'string' ? token : ''} />
        </div>
      </main>
    </PublicShell>
  )
}
