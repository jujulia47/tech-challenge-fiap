'use client'

import { CardWelcome } from '@/app/dashboard/components/CardWelcome'
import { useUser } from '@/hooks/use-user'
import { getFirstName } from '@/lib/utils/user'

export function DashboardWelcome() {
  const user = useUser()
  return (
    <CardWelcome
      name={getFirstName(user.name)}
      date={new Date().toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })}
      balance="R$ 2.500,00"
      accountType="Conta Corrente"
    />
  )
}
