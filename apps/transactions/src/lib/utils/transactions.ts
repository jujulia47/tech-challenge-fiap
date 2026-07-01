import type { Transaction } from '@/types/transaction'

export const TRANSACTION_OPTIONS = [
  { value: 'Câmbio de Moeda',            label: 'Câmbio de Moeda' },
  { value: 'DOC/TED',                    label: 'DOC/TED' },
  { value: 'Empréstimo e Financiamento', label: 'Empréstimo e Financiamento' },
  { value: 'Depósito',                   label: 'Depósito' },
  { value: 'Saque',                      label: 'Saque' },
  { value: 'Transferência',              label: 'Transferência' },
  { value: 'Pagamento',                  label: 'Pagamento' },
]

export function capitalizeMonth(month: string): string {
  return month.charAt(0).toUpperCase() + month.slice(1)
}

export function groupByMonth(transactions: Transaction[]) {
  const reversed = [...transactions].reverse()
  return Object.entries(
    reversed.reduce<Record<string, Transaction[]>>((acc, tx) => {
      acc[tx.month] = [...(acc[tx.month] ?? []), tx]
      return acc
    }, {})
  ).map(([month, transactions]) => ({ month, transactions }))
}
