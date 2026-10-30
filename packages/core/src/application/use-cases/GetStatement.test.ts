import { describe, expect, it } from 'vitest'
import { Transaction } from '../../domain/transaction/Transaction'
import { aTransaction } from '../../testing/fakes'
import { InMemoryTransactionRepository } from '../../testing/InMemoryTransactionRepository'
import { GetStatement } from './GetStatement'

describe('GetStatement', () => {
  it('returns no groups when the user has no transactions', async () => {
    const useCase = new GetStatement(new InMemoryTransactionRepository())

    await expect(useCase.execute('user-a')).resolves.toEqual({ groups: [] })
  })

  it('groups by month, newest first, without mixing years', async () => {
    const useCase = new GetStatement(
      new InMemoryTransactionRepository([
        aTransaction({ id: 'nov-2022', date: '2022-11-18' }),
        aTransaction({ id: 'nov-2026', date: '2026-11-05' }),
        aTransaction({ id: 'jan-15', date: '2026-01-15' }),
        aTransaction({ id: 'jan-20', date: '2026-01-20' }),
      ]),
    )

    const { groups } = await useCase.execute('user-a')

    expect(groups.map(g => g.monthKey)).toEqual(['2026-11', '2026-01', '2022-11'])
    expect(groups.map(g => g.transactions.map(t => t.id))).toEqual([['nov-2026'], ['jan-20', 'jan-15'], ['nov-2022']])
  })

  it('returns plain DTOs, not entities', async () => {
    const useCase = new GetStatement(new InMemoryTransactionRepository([aTransaction()]))

    const { groups } = await useCase.execute('user-a')

    expect(groups[0].transactions[0]).not.toBeInstanceOf(Transaction)
    expect(groups[0].transactions[0]).toEqual({
      id: '1',
      userId: 'user-a',
      type: 'deposit',
      amountInCents: 15000,
      date: '2022-11-18',
    })
  })

  it('never includes transactions of another user', async () => {
    const useCase = new GetStatement(
      new InMemoryTransactionRepository([
        aTransaction({ id: 'a', userId: 'user-a' }),
        aTransaction({ id: 'b', userId: 'user-b' }),
      ]),
    )

    const { groups } = await useCase.execute('user-a')

    expect(groups.flatMap(g => g.transactions.map(t => t.id))).toEqual(['a'])
  })
})
