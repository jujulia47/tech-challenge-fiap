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
  const { digits, formatted, handleChange, setDigits } = useCurrencyInput()
  const [attachment, setAttachment] = useState<string | undefined>(undefined)
  const [attachmentName, setAttachmentName] = useState<string>('')
  const [errors, setErrors] = useState<{ type?: string; amount?: string; date?: string; attachment?: string }>({})

  const amountValue = parseFloat(digits) / 100
  const suggestion = !type && amountValue >= 1000 ? 'Depósito'
    : !type && amountValue > 0 && amountValue < 1000 ? 'Pagamento'
    : null

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 100 * 1024) {
      setErrors(prev => ({ ...prev, attachment: 'Arquivo deve ter no máximo 100KB' }))
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setAttachment(reader.result as string)
      setAttachmentName(file.name)
      setErrors(prev => ({ ...prev, attachment: '' }))
    }
    reader.readAsDataURL(file)
  }

  async function handleSubmit(e: React.SubmitEvent) {
    e.preventDefault()
    const newErrors: Record<string, string> = {}
    if (!type) newErrors.type = 'Selecione o tipo de transação'
    if (!digits || digits === '0' || parseFloat(digits) === 0) newErrors.amount = 'Informe um valor maior que zero'
    const selectedDate = new Date(date + 'T00:00:00')
    const today = new Date()
    today.setHours(23, 59, 59, 999)
    if (selectedDate > today) newErrors.date = 'A data não pode ser futura'
    if (Object.keys(newErrors).length > 0) {
      setErrors(prev => ({ ...prev, ...newErrors }))
      return
    }
    setErrors({})
    try {
      await addTransaction({
        date: new Date().toLocaleDateString('pt-BR'),
        transactionDate: new Date(date + 'T00:00:00').toLocaleDateString('pt-BR'),
        label: type as TransactionType,
        amount: `R$ ${formatted}`,
        month: new Date().toLocaleDateString('pt-BR', { month: 'long', timeZone: 'America/Sao_Paulo' }),
        attachment,
      })
      setDigits('0')
      setType('')
      setDate(new Date().toISOString().split('T')[0])
      setErrors({})
      setAttachment(undefined)
      setAttachmentName('')
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
        <div className="w-full md:w-select-md flex flex-col gap-1">
          <Select
            label="Tipo de transação"
            placeholder="Selecione o tipo de transação"
            options={TRANSACTION_OPTIONS}
            value={type}
            onChange={setType}
          />
          {errors.type && <span className="text-meta text-error">{errors.type}</span>}
          {suggestion && (
            <button type="button" onClick={() => setType(suggestion)}
              className="text-meta text-accent hover:underline self-start">
              Sugestão: {suggestion}
            </button>
          )}
        </div>

        <div className="w-full md:w-button-md">
          <Input
            label="Data"
            type="date"
            value={date}
            onChange={setDate}
          />
          {errors.date && <span className="text-meta text-error">{errors.date}</span>}
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
          {errors.amount && <span className="text-meta text-error">{errors.amount}</span>}
        </div>

        <div className="w-full md:w-button-md flex flex-col gap-1">
          <label className="text-body-semibold text-primary-50">
            Anexo (opcional)
          </label>
          <span className="text-meta text-text-secondary">Máximo 100KB. Formatos: imagem ou PDF</span>
          <label className="flex items-center gap-3 h-12 px-4 rounded-md border border-primary-900 bg-inverse cursor-pointer hover:opacity-90">
            <span className="material-icons text-icon-md text-primary-800">attach_file</span>
            <span className="text-body text-primary-800 truncate">
              {attachmentName || 'Selecionar arquivo'}
            </span>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
          {attachmentName && attachment?.startsWith('data:image') && (
            <img
              src={attachment}
              alt="Preview do anexo"
              className="mt-2 rounded-md max-h-32 object-contain border border-primary-900"
            />
          )}
          {errors.attachment && (
            <span className="text-meta text-error">{errors.attachment}</span>
          )}
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
