import {
  CreateTransaction,
  DeleteTransaction,
  GetBalance,
  GetChartData,
  GetStatement,
  ListTransactions,
  UpdateTransaction,
} from '@bytebank/core'
import { FixedClock, InMemoryTransactionRepository, SequentialIdGenerator } from '@bytebank/core/testing'
import { describe, expect, it } from 'vitest'
import { createUseCases } from './createUseCases'

const dependencies = () => ({
  repository: new InMemoryTransactionRepository(),
  clock: new FixedClock('2026-03-15'),
  idGenerator: new SequentialIdGenerator(),
})

describe('createUseCases', () => {
  it('builds every use case', () => {
    const useCases = createUseCases(dependencies())

    expect(useCases.listTransactions).toBeInstanceOf(ListTransactions)
    expect(useCases.createTransaction).toBeInstanceOf(CreateTransaction)
    expect(useCases.updateTransaction).toBeInstanceOf(UpdateTransaction)
    expect(useCases.deleteTransaction).toBeInstanceOf(DeleteTransaction)
    expect(useCases.getBalance).toBeInstanceOf(GetBalance)
    expect(useCases.getStatement).toBeInstanceOf(GetStatement)
    expect(useCases.getChartData).toBeInstanceOf(GetChartData)
  })

  it('shares the same repository between the use cases', async () => {
    const { createTransaction, listTransactions } = createUseCases(dependencies())

    const created = await createTransaction.execute({
      userId: 'user-a',
      type: 'deposit',
      amountInCents: 100,
      date: '2026-03-01',
    })

    expect(await listTransactions.execute('user-a')).toEqual([created])
  })

  it('uses the given id generator and clock', async () => {
    const { createTransaction } = createUseCases(dependencies())
    const input = { userId: 'user-a', type: 'deposit', amountInCents: 100 }

    const created = await createTransaction.execute({ ...input, date: '2026-03-15' })

    expect(created.id).toBe('id-1')
    await expect(createTransaction.execute({ ...input, date: '2026-03-16' })).rejects.toMatchObject({
      code: 'TRANSACTION_DATE_IN_FUTURE',
    })
  })
})
