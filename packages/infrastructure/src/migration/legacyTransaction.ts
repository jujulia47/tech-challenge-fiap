import { InfrastructureError } from '../errors/InfrastructureError'

// The format written by the apps before Phase 4
export interface LegacyTransaction {
  id: string
  label: string
  amount: string
  date: string
  month: string
  transactionDate?: string
  attachment?: string
}

export const LEGACY_LABEL_TO_TYPE: ReadonlyMap<string, string> = new Map([
  ['Depósito', 'deposit'],
  ['Saque', 'withdrawal'],
  ['Transferência', 'transfer'],
  ['Pagamento', 'payment'],
  ['Câmbio de Moeda', 'currency_exchange'],
  ['DOC/TED', 'doc_ted'],
  ['Empréstimo e Financiamento', 'loan'],
])

export function parseLegacyTransaction(value: Record<string, unknown>): LegacyTransaction {
  const { id, label, amount, date, month, transactionDate, attachment } = value
  const isValid =
    typeof id === 'string' &&
    typeof label === 'string' &&
    typeof amount === 'string' &&
    typeof date === 'string' &&
    typeof month === 'string' &&
    (transactionDate === undefined || typeof transactionDate === 'string') &&
    (attachment === undefined || typeof attachment === 'string')

  if (!isValid) throw new InfrastructureError('Record does not match the legacy format')
  return value as unknown as LegacyTransaction
}
