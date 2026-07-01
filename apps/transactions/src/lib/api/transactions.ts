import type { Transaction } from '@/types/transaction'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'
const BASE_URL = `${API_URL}/transactions`

export async function fetchTransactions(): Promise<Transaction[]> {
  const res = await fetch(BASE_URL)
  if (!res.ok) throw new Error('Failed to fetch transactions')
  return res.json()
}

export async function createTransaction(data: Omit<Transaction, 'id'>): Promise<Transaction> {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to create transaction')
  return res.json()
}

export async function updateTransaction(data: Transaction): Promise<Transaction> {
  const res = await fetch(`${BASE_URL}/${data.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to update transaction')
  return res.json()
}

export async function deleteTransaction(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete transaction')
}
