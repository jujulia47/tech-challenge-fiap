'use client'

import { useState } from 'react'
import { MAX_ATTACHMENT_BYTES } from '@bytebank/bff/limits'
import { Button, Input, Select, useCurrencyInput, useFileAttachment } from '@bytebank/design-system'
import { useCreateTransactionMutation } from '@/store/transactionsApi'
import {
  ApplicationError,
  CalendarDate,
  assertDateNotInFuture,
  isTransactionType,
  suggestTransactionType,
} from '@bytebank/core'
import { BrowserClock, TRANSACTION_TYPE_LABELS, TRANSACTION_TYPE_OPTIONS } from '@bytebank/utils'

interface CardNewTransactionProps {
  onSuccess?: (message: string) => void
  onError?: (message: string) => void
}

// The day in São Paulo, by the same rule as the server
const clock = new BrowserClock()
const today = () => clock.today().toISO()

// The rule of the core. A date it cannot read is left to the server, which answers it.
function isInFuture(date: string): boolean {
  try {
    assertDateNotInFuture(CalendarDate.fromISO(date), clock)
    return false
  } catch (error) {
    return error instanceof ApplicationError && error.code === 'TRANSACTION_DATE_IN_FUTURE'
  }
}

export function CardNewTransaction({ onSuccess, onError }: CardNewTransactionProps) {
  const [createTransaction] = useCreateTransactionMutation()
  const [type, setType] = useState('')
  const [date, setDate] = useState(today)
  const { digits, formatted, handleChange, setDigits } = useCurrencyInput()
  // Apart, not as one object: the lint of React refuses to read an object that holds a ref
  const { dataUrl, name: attachmentName, error: attachmentError, inputRef: fileInput, choose, clear: clearAttachment } =
    useFileAttachment(MAX_ATTACHMENT_BYTES)
  const [errors, setErrors] = useState<{ type?: string; amount?: string; date?: string }>({})

  const amountInCents = parseInt(digits, 10)
  const suggestion = type ? null : suggestTransactionType(amountInCents)

  // The button goes away with the file: the focus returns to the field, not to the page
  function removeAttachment() {
    clearAttachment()
    fileInput.current?.focus()
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const newErrors: Record<string, string> = {}
    if (!isTransactionType(type)) newErrors.type = 'Selecione o tipo de transação'
    if (amountInCents === 0) newErrors.amount = 'Informe um valor maior que zero'
    if (isInFuture(date)) newErrors.date = 'A data não pode ser futura'
    if (!isTransactionType(type) || Object.keys(newErrors).length > 0) {
      setErrors(prev => ({ ...prev, ...newErrors }))
      return
    }
    setErrors({})
    try {
      await createTransaction({ type, amountInCents, date, attachment: dataUrl }).unwrap()
      setDigits('0')
      setType('')
      setDate(today())
      setErrors({})
      clearAttachment()
      onSuccess?.('Transação adicionada com sucesso')
    } catch {
      onError?.('Erro ao adicionar transação')
    }
  }

  return (
    <div className="relative bg-surface-form rounded-md overflow-hidden p-6 md:p-8 lg:p-6">
      <h2 className="text-heading font-bold text-primary-900 mb-8 text-center md:text-left">
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
              className="text-meta text-primary-900 underline hover:no-underline self-start min-h-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-900 rounded">
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
          <label htmlFor="new-transaction-valor" className="text-body-semibold text-primary-900">Valor</label>
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
          <label htmlFor="attachment-input" className="text-body-semibold text-primary-900">
            Anexo (opcional)
          </label>
          <span className="text-meta text-text-secondary">Máximo {MAX_ATTACHMENT_BYTES / 1024}KB. Formatos: imagem ou PDF</span>
          <label className="flex items-center gap-3 h-12 px-4 rounded-md border border-primary-900 bg-inverse cursor-pointer hover:opacity-90 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary-900">
            <span className="material-icons text-icon-md text-primary-800" aria-hidden="true">attach_file</span>
            <span className="text-body text-primary-800 truncate">
              {attachmentName || 'Selecionar arquivo'}
            </span>
            <input
              ref={fileInput}
              id="attachment-input"
              type="file"
              accept="image/png,image/jpeg,image/webp,application/pdf"
              onChange={choose}
              className="sr-only"
            />
          </label>
          {attachmentName && dataUrl?.startsWith('data:image') && (
            // eslint-disable-next-line @next/next/no-img-element -- attachment is a base64 data URL; next/image does not optimize data URLs
            <img
              src={dataUrl}
              alt="Preview do anexo"
              className="mt-2 rounded-md max-h-32 object-contain border border-primary-900"
            />
          )}
          {attachmentName && (
            <button type="button" onClick={removeAttachment} aria-label={`Remover anexo ${attachmentName}`}
              className="flex items-center gap-1 self-start min-h-6 text-meta text-error underline hover:no-underline rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-900"
            >
              <span className="material-icons text-icon-xs" aria-hidden="true">close</span>
              Remover anexo
            </button>
          )}
          {attachmentError && (
            <span role="alert" aria-live="polite" className="text-meta text-error">{attachmentError}</span>
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
