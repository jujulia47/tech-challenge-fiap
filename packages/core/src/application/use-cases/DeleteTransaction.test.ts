import { describe, expect, it } from 'vitest'
import { aTransaction } from '../../testing/fakes'
import { InMemoryTransactionRepository } from '../../testing/InMemoryTransactionRepository'
import { DeleteTransaction } from './DeleteTransaction'

function setup() {
  const repository = new InMemoryTransactionRepository([aTransaction({ id: '1', userId: 'user-a' })])
  return { repository, useCase: new DeleteTransaction(repository) }
}

describe('DeleteTransaction', () => {
  it('deletes the transaction of the user', async () => {
    const { repository, useCase } = setup()

    await useCase.execute({ id: '1', userId: 'user-a' })

    await expect(repository.findById('1', 'user-a')).resolves.toBeNull()
  })

  it('throws TRANSACTION_NOT_FOUND when the transaction does not exist', async () => {
    const { useCase } = setup()

    await expect(useCase.execute({ id: 'missing', userId: 'user-a' })).rejects.toMatchObject({
      code: 'TRANSACTION_NOT_FOUND',
    })
  })

  it('uses the same error for a transaction of another user and keeps it', async () => {
    const { repository, useCase } = setup()

    await expect(useCase.execute({ id: '1', userId: 'user-b' })).rejects.toMatchObject({
      code: 'TRANSACTION_NOT_FOUND',
    })
    await expect(repository.findById('1', 'user-a')).resolves.not.toBeNull()
  })
})

describe('InMemoryTransactionRepository', () => {
  it('delete ignores a transaction of another user', async () => {
    const repository = new InMemoryTransactionRepository([aTransaction({ id: '1', userId: 'user-a' })])

    await repository.delete('1', 'user-b')

    await expect(repository.findById('1', 'user-a')).resolves.not.toBeNull()
  })
})
