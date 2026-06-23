interface TransactionItemProps {
  id: string
  date: string
  label: string
  amount: string
  showDivider?: boolean
  onDetail?: (id: string) => void
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
}

export function TransactionItem({
  id,
  date,
  label,
  amount,
  showDivider = true,
  onDetail,
  onEdit,
  onDelete,
}: TransactionItemProps) {
  return (
    <div className="py-2">
      <div className="flex items-center gap-2">
        <span className="text-body text-text-primary flex-1 min-w-0 truncate">{label}</span>
        <span className="text-meta text-text-secondary shrink-0">{date}</span>
        {(onDetail || onEdit || onDelete) && (
          <div className="flex items-center gap-1 shrink-0">
            {onDetail && (
              <button
                type="button"
                onClick={() => onDetail(id)}
                aria-label="Ver detalhes"
                className="text-text-secondary hover:opacity-70 transition-opacity focus-visible:outline-2 focus-visible:outline-text-secondary rounded-sm"
              >
                <span className="material-icons text-icon-sm">info</span>
              </button>
            )}
            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(id)}
                aria-label="Editar transação"
                className="text-primary-900 hover:opacity-70 transition-opacity focus-visible:outline-2 focus-visible:outline-primary-900 rounded-sm"
              >
                <span className="material-icons text-icon-sm">edit</span>
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(id)}
                aria-label="Excluir transação"
                className="text-error hover:opacity-70 transition-opacity focus-visible:outline-2 focus-visible:outline-error rounded-sm"
              >
                <span className="material-icons text-icon-sm">delete</span>
              </button>
            )}
          </div>
        )}
      </div>
      <p className="text-body-semibold text-text-primary mt-2">{amount}</p>
      {showDivider && <div className="border-t border-success mt-2" />}
    </div>
  )
}
