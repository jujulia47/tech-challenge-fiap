'use client'

import { CardWelcome } from '@/components/dashboard/CardWelcome'
import { useUser } from '@/hooks/use-user'
import { useGetBalanceQuery } from '@/store/transactionsApi'
import { formatSignedCents, getFirstName } from '@bytebank/utils'

export function DashboardWelcome() {
  const user = useUser()
  const { data, isError } = useGetBalanceQuery()

  const balance = isError
    ? 'Indisponível'
    : data
      ? formatSignedCents(Math.abs(data.amountInCents), data.amountInCents < 0 ? 'expense' : 'income')
      : 'Carregando...'

  return (
    <CardWelcome
      name={getFirstName(user.name)}
      date={new Date().toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        timeZone: 'America/Sao_Paulo',
      })}
      balance={balance}
      accountType="Conta Corrente"
    />
  )
}
