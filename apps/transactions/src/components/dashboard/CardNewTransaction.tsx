'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useTransactionsContext } from '@/context/TransactionsContext'
import { useCurrencyInput } from '@/hooks/use-currency-input'
import { TRANSACTION_OPTIONS } from '@/lib/utils/transactions'
import type { TransactionType } from '@/types/transaction'

interface CardNewTransactionProps {
  onSuccess?: (message: string) => void
  onError?: (message: string) => void
}

export function CardNewTransaction({ onSuccess, onError }: CardNewTransactionProps) {
  const { addTransaction } = useTransactionsContext()
  const [type, setType] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [error, setError] = useState('')
  const { digits, formatted, handleChange, setDigits } = useCurrencyInput()

  async function handleSubmit(e: React.SubmitEvent) {
    e.preventDefault()
    if (digits === '0' || !type) {
      setError('Informe o tipo e o valor da transação')
      return
    }
    try {
      await addTransaction({
        date: new Date().toLocaleDateString('pt-BR'),
        transactionDate: new Date(date + 'T00:00:00').toLocaleDateString('pt-BR'),
        label: type as TransactionType,
        amount: `R$ ${formatted}`,
        month: new Date().toLocaleDateString('pt-BR', { month: 'long', timeZone: 'America/Sao_Paulo' }),
      })
      setDigits('0')
      setType('')
      setDate(new Date().toISOString().split('T')[0])
      setError('')
      onSuccess?.('Transação adicionada com sucesso')
    } catch {
      onError?.('Erro ao adicionar transação')
    }
  }

  return (
    <div className="relative bg-surface-form rounded-md overflow-hidden p-6 md:p-8 lg:p-6">
      <h2 className="text-heading font-bold text-primary-50 mb-8 text-center md:text-left">
        Nova transação
      </h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-8 items-center md:items-start">
        <div className="w-full md:w-select-md">
          <Select
            label="Tipo de transação"
            placeholder="Selecione o tipo de transação"
            options={TRANSACTION_OPTIONS}
            value={type}
            onChange={setType}
          />
        </div>

        <div className="w-full md:w-button-md">
          <Input
            label="Data"
            type="date"
            value={date}
            onChange={setDate}
          />
        </div>

        <div className="w-full md:w-button-md flex flex-col gap-1">
          <label htmlFor="new-transaction-valor" className="text-body-semibold text-primary-50">Valor</label>
          <input
            id="new-transaction-valor"
            type="text"
            inputMode="numeric"
            value={formatted}
            onChange={handleChange}
            placeholder="0,00"
            className="h-12 w-full px-4 rounded-md border border-primary-900 bg-inverse text-body text-primary-800 focus:border-2 focus:border-primary-800 focus:outline-none"
          />
          {error && <span className="text-meta text-error">{error}</span>}
        </div>

        <div className="w-full md:w-button-md">
          <Button
            type="submit"
            variant="primary"
            label="Concluir transação"
            fullWidth
          />
        </div>
      </form>
    </div>
  )
}
