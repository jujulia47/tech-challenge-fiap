'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { useTransactions } from '@/context/TransactionsContext'
import { useCurrencyInput } from '@/hooks/use-currency-input'
import { TRANSACTION_OPTIONS } from '@/lib/utils/transactions'
import type { Transaction, TransactionType } from '@/types/transaction'

interface ModalEditTransactionProps {
  transaction: Transaction | null
  onClose: () => void
  onSuccess: () => void
}

export function ModalEditTransaction({ transaction, onClose, onSuccess }: ModalEditTransactionProps) {
  const { editTransaction } = useTransactions()
  const [type, setType]   = useState('')
  const [error, setError] = useState('')
  const { digits, formatted, handleChange, setDigits } = useCurrencyInput()

  useEffect(() => {
    if (!transaction) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- populates form fields when target transaction changes; refactor to key-based remount tracked as tech debt
    setType(transaction.label)
    const raw = transaction.amount
      .replace('R$ ', '')
      .replace('-R$ ', '')
      .replace(/\./g, '')
      .replace(',', '')
    setDigits(raw || '0')
    setError('')
  }, [transaction, setDigits])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!type || digits === '0') {
      setError('Preencha todos os campos')
      return
    }
    try {
      await editTransaction({
        ...transaction!,
        label: type as TransactionType,
        amount: `R$ ${formatted}`,
      })
      onClose()
      onSuccess()
    } catch {
      setError('Erro ao salvar alterações. Tente novamente.')
    }
  }

  return (
    <Modal isOpen={transaction !== null} onClose={onClose} title="Editar transação">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-6">
        <Select
          label="Tipo de transação"
          placeholder="Selecione o tipo"
          options={TRANSACTION_OPTIONS}
          value={type}
          onChange={setType}
        />
        <div className="flex flex-col gap-1">
          <label htmlFor="edit-transaction-valor" className="text-body-semibold text-primary-50">Valor</label>
          <input
            id="edit-transaction-valor"
            type="text"
            inputMode="numeric"
            value={formatted}
            onChange={handleChange}
            placeholder="0,00"
            className="h-12 w-full px-4 rounded-md border border-primary-900 bg-inverse text-body text-primary-800 focus:border-2 focus:border-primary-800 focus:outline-none"
          />
          {error && <span className="text-meta text-error">{error}</span>}
        </div>
        <div className="mt-8">
          <Button
            type="submit"
            variant="success"
            label="Salvar alterações"
            fullWidth
          />
        </div>
      </form>
    </Modal>
  )
}
