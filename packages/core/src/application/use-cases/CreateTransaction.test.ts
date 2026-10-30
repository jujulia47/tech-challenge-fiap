import { describe, expect, it } from 'vitest'
import { Transaction } from '../../domain/transaction/Transaction'
import { FixedClock, SequentialIdGenerator } from '../../testing/fakes'
import { InMemoryTransactionRepository } from '../../testing/InMemoryTransactionRepository'
import { CreateTransaction } from './CreateTransaction'

const input = { userId: 'user-a', type: 'deposit', amountInCents: 15000, date: '2026-05-15' }

function setup() {
  const repository = new InMemoryTransactionRepository()
  const useCase = new CreateTransaction(repository, new FixedClock('2026-05-15'), new SequentialIdGenerator())
  return { repository, useCase }
}

describe('CreateTransaction', () => {
  it('generates the id, stores the transaction and returns the DTO', async () => {
    const { repository, useCase } = setup()

    const created = await useCase.execute(input)

    expect(created).toEqual({ ...input, id: 'id-1' })
    expect((await repository.findById('id-1', 'user-a'))?.toPrimitives()).toEqual(created)
  })

  it('returns what the repository stored, even if it assigned another id', async () => {
    class ServerAssignedIds extends InMemoryTransactionRepository {
      async create(transaction: Transaction): Promise<Transaction> {
        return Transaction.fromPrimitives({ ...transaction.toPrimitives(), id: 'server-id' })
      }
    }
    const useCase = new CreateTransaction(
      new ServerAssignedIds(),
      new FixedClock('2026-05-15'),
      new SequentialIdGenerator(),
    )

    await expect(useCase.execute(input)).resolves.toMatchObject({ id: 'server-id' })
  })

  it('uses a new id for each transaction', async () => {
    const { useCase } = setup()

    const first = await useCase.execute(input)
    const second = await useCase.execute(input)

    expect(first.id).not.toBe(second.id)
  })

  it('keeps the attachment', async () => {
    const { useCase } = setup()

    await expect(useCase.execute({ ...input, attachment: 'file' })).resolves.toMatchObject({ attachment: 'file' })
  })

  it('allows the date of today', async () => {
    const { useCase } = setup()

    await expect(useCase.execute({ ...input, date: '2026-05-15' })).resolves.toMatchObject({ date: '2026-05-15' })
  })

  it('allows a past date', async () => {
    const { useCase } = setup()

    await expect(useCase.execute({ ...input, date: '2022-11-18' })).resolves.toMatchObject({ date: '2022-11-18' })
  })

  it('rejects a future date and stores nothing', async () => {
    const { repository, useCase } = setup()

    await expect(useCase.execute({ ...input, date: '2026-05-16' })).rejects.toMatchObject({
      code: 'TRANSACTION_DATE_IN_FUTURE',
    })
    await expect(repository.findAllByUser('user-a')).resolves.toEqual([])
  })

  it('keeps the entity invariants', async () => {
    const { useCase } = setup()

    await expect(useCase.execute({ ...input, amountInCents: 0 })).rejects.toMatchObject({
      code: 'TRANSACTION_INVALID_AMOUNT',
    })
    await expect(useCase.execute({ ...input, type: 'Depósito' })).rejects.toMatchObject({
      code: 'TRANSACTION_INVALID_TYPE',
    })
    await expect(useCase.execute({ ...input, userId: '' })).rejects.toMatchObject({
      code: 'TRANSACTION_INVALID_USER_ID',
    })
    await expect(useCase.execute({ ...input, date: '18/11/2022' })).rejects.toMatchObject({
      code: 'CALENDAR_DATE_INVALID_FORMAT',
    })
  })
})
