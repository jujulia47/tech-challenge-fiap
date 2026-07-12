export type TransactionType =
  | 'Depósito'
  | 'Saque'
  | 'Transferência'
  | 'Pagamento'
  | 'Câmbio de Moeda'
  | 'DOC/TED'
  | 'Empréstimo e Financiamento'

export interface Transaction {
  id: string
  date: string             
  label: TransactionType
  amount: string        
  month: string
  transactionDate?: string
  attachment?: string
}
