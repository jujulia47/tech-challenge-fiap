'use client'

import { Toast, useToast } from '@bytebank/design-system'
import { PasswordForm } from '@/app/account/components/PasswordForm'
import { ProfileForm } from '@/app/account/components/ProfileForm'

interface CardAccountProps {
  initialName: string
  email: string
}

export function CardAccount({ initialName, email }: CardAccountProps) {
  const { toast, showToast } = useToast()

  return (
    <div className="relative bg-surface-form rounded-md p-6 overflow-hidden flex flex-col gap-8">
      <h2 className="text-heading text-text-primary">Minha conta</h2>

      <ProfileForm
        initialName={initialName}
        email={email}
        onSuccess={message => showToast(message, 'success')}
        onError={message => showToast(message, 'error')}
      />

      <PasswordForm
        email={email}
        onSuccess={message => showToast(message, 'success')}
        onError={message => showToast(message, 'error')}
      />

      <Toast message={toast.message} type={toast.type} visible={toast.visible} />
    </div>
  )
}
