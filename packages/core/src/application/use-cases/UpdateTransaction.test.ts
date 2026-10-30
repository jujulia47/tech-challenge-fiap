import { describe, expect, it } from 'vitest'
import { aTransaction, FixedClock } from '../../testing/fakes'
import { InMemoryTransactionRepository } from '../../testing/InMemoryTransactionRepository'
import { UpdateTransaction } from './UpdateTransaction'

const stored = { id: '1', userId: 'user-a', attachment: 'file' }

function setup(existing = aTransaction(stored)) {
  const repository = new InMemoryTransactionRepository([existing])
  const useCase = new UpdateTransaction(repository, new FixedClock('2026-05-15'))
  return { repository, useCase }
}

describe('UpdateTransaction', () => {
  it('applies every change, stores it and returns the DTO', async () => {
    const { repository, useCase } = setup()

    const updated = await useCase.execute({
      id: '1',
      userId: 'user-a',
      changes: { type: 'payment', amountInCents: 100, date: '2026-03-08', attachment: 'other' },
    })

    expect(updated).toEqual({
      id: '1',
      userId: 'user-a',
      type: 'payment',
      amountInCents: 100,
      date: '2026-03-08',
      attachment: 'other',
    })
    expect((await repository.findById('1', 'user-a'))?.toPrimitives()).toEqual(updated)
  })

  it('keeps what is not in the changes', async () => {
    const { useCase } = setup()

    const updated = await useCase.execute({ id: '1', userId: 'user-a', changes: { amountInCents: 100 } })

    expect(updated).toMatchObject({ type: 'deposit', date: '2022-11-18', attachment: 'file' })
  })

  it('removes the attachment when it is explicitly undefined', async () => {
    const { useCase } = setup()

    const updated = await useCase.execute({ id: '1', userId: 'user-a', changes: { attachment: undefined } })

    expect(updated).not.toHaveProperty('attachment')
  })

  it('throws TRANSACTION_NOT_FOUND when the transaction does not exist', async () => {
    const { useCase } = setup()

    await expect(useCase.execute({ id: 'missing', userId: 'user-a', changes: {} })).rejects.toMatchObject({
      code: 'TRANSACTION_NOT_FOUND',
    })
  })

  it('uses the same error for a transaction of another user and leaves it unchanged', async () => {
    const { repository, useCase } = setup()

    await expect(
      useCase.execute({ id: '1', userId: 'user-b', changes: { amountInCents: 1 } }),
    ).rejects.toMatchObject({ code: 'TRANSACTION_NOT_FOUND' })
    expect((await repository.findById('1', 'user-a'))?.amount.toCents()).toBe(15000)
  })

  it('reports not found before validating the changes', async () => {
    const { useCase } = setup()

    await expect(
      useCase.execute({ id: '1', userId: 'user-b', changes: { amountInCents: 0 } }),
    ).rejects.toMatchObject({ code: 'TRANSACTION_NOT_FOUND' })
  })

  it('rejects a change to a future date and stores nothing', async () => {
    const { repository, useCase } = setup()

    await expect(
      useCase.execute({ id: '1', userId: 'user-a', changes: { date: '2026-05-16' } }),
    ).rejects.toMatchObject({ code: 'TRANSACTION_DATE_IN_FUTURE' })
    expect((await repository.findById('1', 'user-a'))?.date.toISO()).toBe('2022-11-18')
  })

  it('allows changing the date to today', async () => {
    const { useCase } = setup()

    const updated = await useCase.execute({ id: '1', userId: 'user-a', changes: { date: '2026-05-15' } })

    expect(updated.date).toBe('2026-05-15')
  })

  it('does not recheck a date that did not change', async () => {
    const { useCase } = setup(aTransaction({ ...stored, date: '2026-06-01' }))

    const updated = await useCase.execute({ id: '1', userId: 'user-a', changes: { amountInCents: 100 } })

    expect(updated.date).toBe('2026-06-01')
  })

  it('keeps the entity invariants', async () => {
    const { useCase } = setup()

    await expect(useCase.execute({ id: '1', userId: 'user-a', changes: { amountInCents: 0 } })).rejects.toMatchObject({
      code: 'TRANSACTION_INVALID_AMOUNT',
    })
    await expect(useCase.execute({ id: '1', userId: 'user-a', changes: { type: 'Saque' } })).rejects.toMatchObject({
      code: 'TRANSACTION_INVALID_TYPE',
    })
  })
})
