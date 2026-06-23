interface BillTransaction {
  id: string
  date: string
  label: string
  amount: string
}

interface BillData {
  currentBill: string
  dueDate: string
  totalLimit: string
  availableLimit: string
  transactions: BillTransaction[]
}

interface CardBillProps {
  data: BillData
  cardLabel: string
}

export function CardBill({ data, cardLabel }: CardBillProps) {
  return (
    <div className="bg-surface-card rounded-md p-6 flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <span className="material-icons text-success text-icon-sm">receipt</span>
        <h2 className="text-heading font-bold text-text-primary">
          Fatura — {cardLabel}
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-primary-900 rounded-md p-4 flex flex-col gap-1">
          <span className="text-meta text-primary-50">Fatura atual</span>
          <span className="text-label font-normal text-inverse">{data.currentBill}</span>
        </div>
        <div className="bg-primary-900 rounded-md p-4 flex flex-col gap-1">
          <span className="text-meta text-primary-50">Vencimento</span>
          <span className="text-label font-normal text-inverse">{data.dueDate}</span>
        </div>
        <div className="bg-primary-900 rounded-md p-4 flex flex-col gap-1">
          <span className="text-meta text-primary-50">Limite total</span>
          <span className="text-label font-normal text-inverse">{data.totalLimit}</span>
        </div>
        <div className="bg-primary-900 rounded-md p-4 flex flex-col gap-1">
          <span className="text-meta text-primary-50">Limite disponível</span>
          <span className="text-label font-normal text-success">{data.availableLimit}</span>
        </div>
      </div>

      <div>
        <p className="text-label text-text-primary mb-4">Últimas transações</p>
        <div className="flex flex-col">
          {data.transactions.map((tx, idx) => (
            <div key={tx.id}>
              <div className="flex items-start gap-2 py-2">
                <span className="text-meta text-text-secondary shrink-0 pt-0.5">{tx.date}</span>
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-body text-text-primary">{tx.label}</span>
                </div>
                <span className="text-body-semibold text-text-primary shrink-0">{tx.amount}</span>
              </div>
              {idx < data.transactions.length - 1 && (
                <div className="border-t border-success" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
