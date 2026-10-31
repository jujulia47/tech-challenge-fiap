'use client'

import { useEffect, useState } from 'react'
import { Button, Modal, Select } from '@bytebank/design-system'
import { useCurrencyInput } from '@/hooks/use-currency-input'
import { useUpdateTransactionMutation } from '@/store/transactionsApi'
import { isTransactionType, type TransactionDTO } from '@bytebank/core'
import { TRANSACTION_TYPE_OPTIONS } from '@bytebank/utils'

interface ModalEditTransactionProps {
  transaction: TransactionDTO | null
  onClose: () => void
  onSuccess: () => void
  onError: (message: string) => void
}

export function ModalEditTransaction({ transaction, onClose, onSuccess, onError }: ModalEditTransactionProps) {
  const [updateTransaction] = useUpdateTransactionMutation()
  const [type, setType]   = useState('')
  const [error, setError] = useState('')
  const { digits, formatted, handleChange, setDigits } = useCurrencyInput()

  useEffect(() => {
    if (!transaction) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- populates form fields when target transaction changes; refactor to key-based remount tracked as tech debt
    setType(transaction.type)
    setDigits(String(transaction.amountInCents))
    setError('')
  }, [transaction, setDigits])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    // digits can be "00" after erasing, so the check is on the number
    const amountInCents = parseInt(digits, 10)
    if (!isTransactionType(type) || amountInCents === 0) {
      setError('Preencha todos os campos')
      return
    }
    try {
      await updateTransaction({ id: transaction!.id, changes: { type, amountInCents } }).unwrap()
      onClose()
      onSuccess()
    } catch {
      setError('Erro ao salvar alterações. Tente novamente.')
      onError('Erro ao salvar alterações')
    }
  }

  return (
    <Modal isOpen={transaction !== null} onClose={onClose} title="Editar transação">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-6">
        <Select
          label="Tipo de transação"
          placeholder="Selecione o tipo"
          options={TRANSACTION_TYPE_OPTIONS}
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
          {error && <span role="alert" aria-live="polite" className="text-meta text-error">{error}</span>}
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
