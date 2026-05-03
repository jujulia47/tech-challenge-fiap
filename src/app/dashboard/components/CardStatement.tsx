import { Link } from '@/components/ui/Link'
import { TransactionItem } from '@/app/dashboard/components/TransactionItem'
import type { Transaction } from '@/app/dashboard/types/transaction'

interface TransactionGroup {
  month: string
  transactions: Transaction[]
}

interface CardStatementProps {
  groups: TransactionGroup[]
  onDetail?: (id: string) => void
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
  limit?: number
  showViewMore?: boolean
}

export function CardStatement({ groups, onDetail, onEdit, onDelete, limit, showViewMore }: CardStatementProps) {
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
        {displayGroups.length === 0 ? (
          <p className="text-body text-text-secondary">Nenhuma transação encontrada</p>
        ) : (
          displayGroups.map((group) => (
            <div key={group.month}>
              <p className="text-meta-semibold text-success">{group.month}</p>
              {group.transactions.map((tx, idx) => (
                <TransactionItem
                  key={tx.id}
                  id={tx.id}
                  date={tx.date}
                  label={tx.label}
                  amount={tx.amount}
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
          <Link href="/dashboard/statement" context="app" size="body">
            Ver extrato completo →
          </Link>
        </div>
      )}
    </div>
  )
}
