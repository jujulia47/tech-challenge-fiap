import type { TransactionMonthGroup } from '@bytebank/utils'
import { formatMonthKey } from '@bytebank/utils'
import { TransactionItem } from '@bytebank/design-system'

interface StatementResultsProps {
  groups: TransactionMonthGroup[]
  loading: boolean
  loadFailed: boolean
  onDetail: (id: string) => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}

export function StatementResults({ groups, loading, loadFailed, onDetail, onEdit, onDelete }: StatementResultsProps) {
  if (loadFailed) {
    return (
      <p role="alert" aria-live="polite" className="text-body text-error">
        Não foi possível carregar as transações. Tente novamente.
      </p>
    )
  }

  if (loading) {
    return <p className="text-body text-text-secondary">Carregando transações...</p>
  }

  if (groups.length === 0) {
    return <p className="text-body text-text-secondary">Nenhuma transação encontrada</p>
  }

  return groups.map(group => (
    <div key={group.monthKey}>
      <p className="text-meta-semibold text-success mb-2">{formatMonthKey(group.monthKey)}</p>
      {group.transactions.map((tx, idx) => (
        <TransactionItem
          key={tx.id}
          transaction={tx}
          showDivider={idx < group.transactions.length - 1}
          onDetail={onDetail}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  ))
}
