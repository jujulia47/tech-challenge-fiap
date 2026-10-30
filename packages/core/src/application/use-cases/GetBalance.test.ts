import { describe, expect, it } from 'vitest'
import { aTransaction } from '../../testing/fakes'
import { InMemoryTransactionRepository } from '../../testing/InMemoryTransactionRepository'
import { GetBalance } from './GetBalance'

// The seven records of apps/shell/db.json, converted to the domain format
const DB_TRANSACTIONS = [
  aTransaction({ id: '1', userId: '1', type: 'deposit', amountInCents: 15000, date: '2022-11-18' }),
  aTransaction({ id: '2', userId: '1', type: 'deposit', amountInCents: 10000, date: '2022-11-21' }),
  aTransaction({ id: '3', userId: '1', type: 'deposit', amountInCents: 5000, date: '2022-11-21' }),
  aTransaction({ id: '6', userId: '1', type: 'transfer', amountInCents: 10000, date: '2022-12-10' }),
  aTransaction({ id: '7', userId: '1', type: 'deposit', amountInCents: 250000, date: '2026-01-15' }),
  aTransaction({ id: '8', userId: '1', type: 'payment', amountInCents: 35000, date: '2026-01-20' }),
  aTransaction({ id: '11', userId: '1', type: 'currency_exchange', amountInCents: 120000, date: '2026-03-08' }),
]

describe('GetBalance', () => {
  it('is zero when the user has no transactions', async () => {
    const useCase = new GetBalance(new InMemoryTransactionRepository())

    await expect(useCase.execute('user-a')).resolves.toEqual({ amountInCents: 0 })
  })

  it('is positive when income exceeds expenses', async () => {
    const useCase = new GetBalance(
      new InMemoryTransactionRepository([
        aTransaction({ id: '1', type: 'deposit', amountInCents: 1000 }),
        aTransaction({ id: '2', type: 'withdrawal', amountInCents: 300 }),
      ]),
    )

    await expect(useCase.execute('user-a')).resolves.toEqual({ amountInCents: 700 })
  })

  it('can be negative', async () => {
    const useCase = new GetBalance(
      new InMemoryTransactionRepository([
        aTransaction({ id: '1', type: 'loan', amountInCents: 100 }),
        aTransaction({ id: '2', type: 'payment', amountInCents: 300 }),
      ]),
    )

    await expect(useCase.execute('user-a')).resolves.toEqual({ amountInCents: -200 })
  })

  it('is zero when income and expenses cancel out', async () => {
    const useCase = new GetBalance(
      new InMemoryTransactionRepository([
        aTransaction({ id: '1', type: 'deposit', amountInCents: 500 }),
        aTransaction({ id: '2', type: 'doc_ted', amountInCents: 500 }),
      ]),
    )

    await expect(useCase.execute('user-a')).resolves.toEqual({ amountInCents: 0 })
  })

  it('ignores transactions of other users', async () => {
    const useCase = new GetBalance(
      new InMemoryTransactionRepository([
        aTransaction({ id: '1', userId: 'user-a', amountInCents: 100 }),
        aTransaction({ id: '2', userId: 'user-b', amountInCents: 900 }),
      ]),
    )

    await expect(useCase.execute('user-a')).resolves.toEqual({ amountInCents: 100 })
  })

  it('gives R$ 1.150,00 for the current db.json data', async () => {
    const useCase = new GetBalance(new InMemoryTransactionRepository(DB_TRANSACTIONS))

    await expect(useCase.execute('1')).resolves.toEqual({ amountInCents: 115000 })
  })
})
