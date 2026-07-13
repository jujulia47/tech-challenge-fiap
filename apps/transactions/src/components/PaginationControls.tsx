'use client'
interface PaginationControlsProps {
  page: number
  totalPages: number
  totalItems: number
  pageSize: number
  onPageChange: (page: number) => void
}

export function PaginationControls({ page, totalPages, totalItems, pageSize, onPageChange }: PaginationControlsProps) {
  if (totalPages <= 1) return null
  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, totalItems)
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
    .reduce<(number | '...')[]>((acc, p, i, arr) => {
      if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('...')
      acc.push(p)
      return acc
    }, [])
  return (
    <div className="flex items-center justify-between mt-4">
      <span className="text-meta text-text-secondary">
        Mostrando {start}–{end} de {totalItems} transações
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className="h-8 px-3 rounded-md text-meta text-text-secondary disabled:opacity-30 hover:bg-primary-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-900"
        >
          ‹ Anterior
        </button>
        {pages.map((p, i) => p === '...' ? (
          <span key={`ellipsis-${i}`} className="h-8 w-8 flex items-center justify-center text-meta text-text-secondary">...</span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p as number)}
            className={`h-8 w-8 rounded-md text-meta transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-900 ${
              page === p
                ? 'border border-primary-900 text-primary-900 font-semibold'
                : 'text-text-secondary hover:bg-primary-50'
            }`}
          >
            {p}
          </button>
        ))}
        <button
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          className="h-8 px-3 rounded-md text-meta text-text-secondary disabled:opacity-30 hover:bg-primary-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-900"
        >
          Próxima ›
        </button>
      </div>
    </div>
  )
}
