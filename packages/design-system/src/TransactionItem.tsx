import { transactionDirection, type TransactionDTO } from '@bytebank/core'
import { TRANSACTION_TYPE_LABELS, formatDateBR, formatSignedCents, onIntent } from '@bytebank/utils'

export type TransactionAction = 'detail' | 'edit' | 'delete'

interface TransactionItemProps {
  transaction: TransactionDTO
  showDivider?: boolean
  onDetail?: (id: string) => void
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
  onActionIntent?: (action: TransactionAction) => void
}

export function TransactionItem({
  transaction,
  showDivider = true,
  onDetail,
  onEdit,
  onDelete,
  onActionIntent,
}: TransactionItemProps) {
  const { id, type, amountInCents, date } = transaction
  const intentOf = (action: TransactionAction) => onIntent(() => onActionIntent?.(action))

  return (
    <div className="py-2">
      <div className="flex items-center gap-2">
        <span className="text-body text-text-primary flex-1 min-w-0 break-normal">{TRANSACTION_TYPE_LABELS[type]}</span>
        {(onDetail || onEdit || onDelete) && (
          <div className="flex items-center gap-1 shrink-0">
            {onDetail && (
              <button
                type="button"
                onClick={() => onDetail(id)}
                {...intentOf('detail')}
                aria-label="Ver detalhes"
                className="text-text-secondary hover:opacity-70 transition-opacity focus-visible:outline-2 focus-visible:outline-text-secondary rounded-sm"
              >
                <span className="material-icons text-icon-sm" aria-hidden="true">info</span>
              </button>
            )}
            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(id)}
                {...intentOf('edit')}
                aria-label="Editar transação"
                className="text-primary-900 hover:opacity-70 transition-opacity focus-visible:outline-2 focus-visible:outline-primary-900 rounded-sm"
              >
                <span className="material-icons text-icon-sm" aria-hidden="true">edit</span>
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(id)}
                {...intentOf('delete')}
                aria-label="Excluir transação"
                className="text-error hover:opacity-70 transition-opacity focus-visible:outline-2 focus-visible:outline-error rounded-sm"
              >
                <span className="material-icons text-icon-sm" aria-hidden="true">delete</span>
              </button>
            )}
          </div>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 mt-2">
        <p className="text-body-semibold text-text-primary">
          {formatSignedCents(amountInCents, transactionDirection(type))}
        </p>
        <span className="text-meta text-text-secondary shrink-0">{formatDateBR(date)}</span>
      </div>
      {showDivider && <div className="border-t border-success mt-2" />}
    </div>
  )
}
