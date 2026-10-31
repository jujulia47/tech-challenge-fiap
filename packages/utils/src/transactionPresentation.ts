import type { TransactionDTO, TransactionDirection, TransactionType } from '@bytebank/core'
import { formatCents } from './currency'

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  deposit: 'Depósito',
  withdrawal: 'Saque',
  transfer: 'Transferência',
  payment: 'Pagamento',
  currency_exchange: 'Câmbio de Moeda',
  doc_ted: 'DOC/TED',
  loan: 'Empréstimo e Financiamento',
}

export interface TransactionTypeOption {
  value: TransactionType
  label: string
}

export interface TransactionMonthGroup {
  monthKey: string
  transactions: TransactionDTO[]
}

// The order of the select in the screens
const OPTION_ORDER: readonly TransactionType[] = [
  'currency_exchange',
  'doc_ted',
  'loan',
  'deposit',
  'withdrawal',
  'transfer',
  'payment',
]

const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

export const TRANSACTION_TYPE_OPTIONS: TransactionTypeOption[] = OPTION_ORDER.map(value => ({
  value,
  label: TRANSACTION_TYPE_LABELS[value],
}))

// String handling only: a Date would bring a timezone into a calendar day (see docs/adr/0002)
export function formatDateBR(isoDate: string): string {
  const [year, month, day] = isoDate.split('-')
  return `${day}/${month}/${year}`
}

export function formatMonthKey(monthKey: string): string {
  const [year, month] = monthKey.split('-')
  return `${MONTH_NAMES[Number(month) - 1]} de ${year}`
}

export function formatSignedCents(amountInCents: number, direction: TransactionDirection): string {
  const formatted = `R$ ${formatCents(amountInCents)}`
  return direction === 'expense' ? `-${formatted}` : formatted
}

// Visual grouping only: the order comes from the input, and the rule behind it lives in the core
export function groupDtosByMonth(dtos: readonly TransactionDTO[]): TransactionMonthGroup[] {
  const groups = new Map<string, TransactionDTO[]>()
  for (const dto of dtos) {
    const monthKey = dto.date.slice(0, 7)
    groups.set(monthKey, [...(groups.get(monthKey) ?? []), dto])
  }
  return [...groups].map(([monthKey, transactions]) => ({ monthKey, transactions }))
}
