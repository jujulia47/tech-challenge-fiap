import { TransactionItem } from '@bytebank/design-system'
import { formatMonthKey, type TransactionMonthGroup } from '@bytebank/utils'

interface CardStatementProps {
  groups: TransactionMonthGroup[]
  loading?: boolean
  loadFailed?: boolean
  onDetail?: (id: string) => void
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
  limit?: number
  showViewMore?: boolean
}

export function CardStatement({
  groups,
  loading,
  loadFailed,
  onDetail,
  onEdit,
  onDelete,
  limit,
  showViewMore,
}: CardStatementProps) {
  const displayGroups = limit
    ? (() => {
        const all = groups.flatMap(g => g.transactions)
        const limited = all.slice(0, limit)
        return groups
          .map(g => ({
            ...g,
            transactions: g.transactions.filter(tx => limited.includes(tx)),
          }))
          .filter(g => g.transactions.length > 0)
      })()
    : groups

  return (
    <div className="bg-surface-card rounded-md px-6 py-8">
      <h2 className="text-heading font-bold text-text-primary mb-6">
        Extrato
      </h2>

      <div className="flex flex-col gap-6">
        {loadFailed ? (
          <p role="alert" aria-live="polite" className="text-body text-error">
            Não foi possível carregar as transações. Tente novamente.
          </p>
        ) : loading ? (
          <p className="text-body text-text-secondary">Carregando transações...</p>
        ) : displayGroups.length === 0 ? (
          <p className="text-body text-text-secondary">Nenhuma transação encontrada</p>
        ) : (
          displayGroups.map((group) => (
            <div key={group.monthKey}>
              <p className="text-meta-semibold text-success">{formatMonthKey(group.monthKey)}</p>
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
        )}
      </div>

      {showViewMore && (
        <div className="mt-4 text-center">
          <a href="/transactions" className="text-success text-body hover:opacity-80 transition-opacity">
            Ver todas as transações →
          </a>
        </div>
      )}
    </div>
  )
}
