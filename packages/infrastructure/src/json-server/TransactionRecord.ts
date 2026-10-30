// The transaction format stored in the json-server collection
export interface TransactionRecord {
  id: string
  userId: string
  type: string
  amountInCents: number
  date: string
  attachment?: string
}
