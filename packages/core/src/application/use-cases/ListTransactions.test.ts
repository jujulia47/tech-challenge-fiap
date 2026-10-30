import { describe, expect, it } from 'vitest'
import { aTransaction } from '../../testing/fakes'
import { InMemoryTransactionRepository } from '../../testing/InMemoryTransactionRepository'
import { ListTransactions } from './ListTransactions'

describe('ListTransactions', () => {
  it('returns an empty list when the user has no transactions', async () => {
    const useCase = new ListTransactions(new InMemoryTransactionRepository())

    await expect(useCase.execute('user-a')).resolves.toEqual([])
  })

  it('returns plain DTOs', async () => {
    const useCase = new ListTransactions(new InMemoryTransactionRepository([aTransaction({ attachment: 'file' })]))

    await expect(useCase.execute('user-a')).resolves.toEqual([
      {
        id: '1',
        userId: 'user-a',
        type: 'deposit',
        amountInCents: 15000,
        date: '2022-11-18',
        attachment: 'file',
      },
    ])
  })

  it('orders by date, newest first, with ties broken by id', async () => {
    const useCase = new ListTransactions(
      new InMemoryTransactionRepository([
        aTransaction({ id: '1', date: '2022-11-18' }),
        aTransaction({ id: '2', date: '2022-11-21' }),
        aTransaction({ id: '3', date: '2022-11-21' }),
        aTransaction({ id: '4', date: '2026-03-08' }),
      ]),
    )

    const result = await useCase.execute('user-a')

    expect(result.map(t => t.id)).toEqual(['4', '3', '2', '1'])
  })

  it('never returns transactions of another user', async () => {
    const useCase = new ListTransactions(
      new InMemoryTransactionRepository([
        aTransaction({ id: 'a', userId: 'user-a' }),
        aTransaction({ id: 'b', userId: 'user-b' }),
      ]),
    )

    const result = await useCase.execute('user-a')

    expect(result.map(t => t.id)).toEqual(['a'])
  })
})
