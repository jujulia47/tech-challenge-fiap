'use client'

import { useState } from 'react'
import { MAX_ATTACHMENT_BYTES } from '@bytebank/bff/limits'
import { Button, Input, Select } from '@bytebank/design-system'
import { useCurrencyInput } from '@/hooks/use-currency-input'
import { useCreateTransactionMutation } from '@/store/transactionsApi'
import { isTransactionType, type TransactionType } from '@bytebank/core'
import { TRANSACTION_TYPE_LABELS, TRANSACTION_TYPE_OPTIONS } from '@bytebank/utils'

interface CardNewTransactionProps {
  onSuccess?: (message: string) => void
  onError?: (message: string) => void
}

// The calendar day in São Paulo, as on the server. toISOString() is UTC: already tomorrow after 21:00.
function today(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
}

export function CardNewTransaction({ onSuccess, onError }: CardNewTransactionProps) {
  const [createTransaction] = useCreateTransactionMutation()
  const [type, setType] = useState('')
  const [date, setDate] = useState(today)
  const { digits, formatted, handleChange, setDigits } = useCurrencyInput()
  const [attachment, setAttachment] = useState<string | undefined>(undefined)
  const [attachmentName, setAttachmentName] = useState<string>('')
  const [errors, setErrors] = useState<{ type?: string; amount?: string; date?: string; attachment?: string }>({})

  const amountInCents = parseInt(digits, 10)
  const suggestion: TransactionType | null = !type && amountInCents >= 100000 ? 'deposit'
    : !type && amountInCents > 0 ? 'payment'
    : null

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_ATTACHMENT_BYTES) {
      setErrors(prev => ({ ...prev, attachment: `Arquivo deve ter no máximo ${MAX_ATTACHMENT_BYTES / 1024}KB` }))
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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const newErrors: Record<string, string> = {}
    if (!isTransactionType(type)) newErrors.type = 'Selecione o tipo de transação'
    if (amountInCents === 0) newErrors.amount = 'Informe um valor maior que zero'
    if (date > today()) newErrors.date = 'A data não pode ser futura'
    if (!isTransactionType(type) || Object.keys(newErrors).length > 0) {
      setErrors(prev => ({ ...prev, ...newErrors }))
      return
    }
    setErrors({})
    try {
      await createTransaction({ type, amountInCents, date, attachment }).unwrap()
      setDigits('0')
      setType('')
      setDate(today())
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
            options={TRANSACTION_TYPE_OPTIONS}
            value={type}
            onChange={setType}
          />
          {errors.type && <span role="alert" aria-live="polite" className="text-meta text-error">{errors.type}</span>}
          {suggestion && (
            <button type="button" onClick={() => setType(suggestion)}
              className="text-meta text-accent hover:underline self-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-900 rounded">
              Sugestão: {TRANSACTION_TYPE_LABELS[suggestion]}
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
          {errors.date && <span role="alert" aria-live="polite" className="text-meta text-error">{errors.date}</span>}
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
          {errors.amount && <span role="alert" aria-live="polite" className="text-meta text-error">{errors.amount}</span>}
        </div>

        <div className="w-full md:w-button-md flex flex-col gap-1">
          <label htmlFor="attachment-input" className="text-body-semibold text-primary-50">
            Anexo (opcional)
          </label>
          <span className="text-meta text-text-secondary">Máximo {MAX_ATTACHMENT_BYTES / 1024}KB. Formatos: imagem ou PDF</span>
          <label className="flex items-center gap-3 h-12 px-4 rounded-md border border-primary-900 bg-inverse cursor-pointer hover:opacity-90">
            <span className="material-icons text-icon-md text-primary-800">attach_file</span>
            <span className="text-body text-primary-800 truncate">
              {attachmentName || 'Selecionar arquivo'}
            </span>
            <input
              id="attachment-input"
              type="file"
              accept="image/png,image/jpeg,image/webp,application/pdf"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
          {attachmentName && attachment?.startsWith('data:image') && (
            // eslint-disable-next-line @next/next/no-img-element -- attachment is a base64 data URL; next/image does not optimize data URLs
            <img
              src={attachment}
              alt="Preview do anexo"
              className="mt-2 rounded-md max-h-32 object-contain border border-primary-900"
            />
          )}
          {errors.attachment && (
            <span role="alert" aria-live="polite" className="text-meta text-error">{errors.attachment}</span>
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
