import type { TransactionType } from '@bytebank/core'
import { TRANSACTION_TYPE_LABELS } from './transactionPresentation'

// The same choice twice clears it, with a slice or with a button
export function toggleTypeFilter(current: TransactionType | null, chosen: TransactionType | null): TransactionType | null {
  return current === chosen ? null : chosen
}

export function typeFilterMessage(type: TransactionType | null): string {
  return type ? `Gráfico de meses filtrado por ${TRANSACTION_TYPE_LABELS[type]}` : 'Filtro removido'
}
