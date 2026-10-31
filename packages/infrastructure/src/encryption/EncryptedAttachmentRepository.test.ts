import { Money } from '@bytebank/core'
import { InMemoryTransactionRepository, aTransaction } from '@bytebank/core/testing'
import { describe, expect, it, vi } from 'vitest'
import { AesGcmCipher } from './AesGcmCipher'
import { EncryptedAttachmentRepository } from './EncryptedAttachmentRepository'

const DATA_URL = `data:image/png;base64,${Buffer.from('imagem de teste').toString('base64')}`
const cipher = new AesGcmCipher(Buffer.alloc(32, 1))

function setup() {
  const inner = new InMemoryTransactionRepository()
  return { inner, repository: new EncryptedAttachmentRepository(inner, cipher) }
}

describe('EncryptedAttachmentRepository', () => {
  it('stores the attachment sealed', async () => {
    const { inner, repository } = setup()

    await repository.create(aTransaction({ attachment: DATA_URL }))

    const [stored] = await inner.findAllByUser('user-a')
    expect(stored.attachment).toMatch(/^aes256gcm\$v1\$/)
    expect(stored.attachment).not.toContain(DATA_URL.split(',')[1])
    expect(stored.attachment).not.toContain('image/png')
  })

  it('returns the plain attachment from create, list and find', async () => {
    const { repository } = setup()

    const created = await repository.create(aTransaction({ attachment: DATA_URL }))

    expect(created.attachment).toBe(DATA_URL)
    expect((await repository.findAllByUser('user-a'))[0].attachment).toBe(DATA_URL)
    expect((await repository.findById(created.id, 'user-a'))?.attachment).toBe(DATA_URL)
  })

  it('seals on update too', async () => {
    const { inner, repository } = setup()
    const created = await repository.create(aTransaction())

    await repository.update(created.update({ attachment: DATA_URL }))

    expect((await inner.findById(created.id, 'user-a'))?.attachment).toMatch(/^aes256gcm\$/)
    expect((await repository.findById(created.id, 'user-a'))?.attachment).toBe(DATA_URL)
  })

  it('keeps the other fields, and a transaction with no attachment', async () => {
    const { repository } = setup()

    const created = await repository.create(aTransaction({ amountInCents: 123 }))

    expect(created.toPrimitives()).toMatchObject({ amountInCents: 123 })
    expect(created.attachment).toBeUndefined()
    expect((await repository.findAllByUser('user-a'))[0].attachment).toBeUndefined()
  })

  it('gives nothing to another user', async () => {
    const { repository } = setup()
    const created = await repository.create(aTransaction({ attachment: DATA_URL }))

    await expect(repository.findById(created.id, 'user-b')).resolves.toBeNull()
    await expect(repository.findAllByUser('user-b')).resolves.toEqual([])
  })

  it('deletes', async () => {
    const { repository } = setup()
    const created = await repository.create(aTransaction({ attachment: DATA_URL }))

    await repository.delete(created.id, 'user-a')

    await expect(repository.findAllByUser('user-a')).resolves.toEqual([])
  })

  it('refuses to store what it cannot seal, instead of storing it in the clear', async () => {
    const { inner, repository } = setup()

    await expect(repository.create(aTransaction({ attachment: 'not-a-data-url' }))).rejects.toMatchObject({
      code: 'UNREADABLE_DATA',
    })
    await expect(inner.findAllByUser('user-a')).resolves.toEqual([])
  })

  describe('an attachment that cannot be read', () => {
    function broken() {
      const inner = new InMemoryTransactionRepository([aTransaction({ id: '7', attachment: 'aes256gcm$v1$a$b$c' })])
      const logger = { error: vi.fn() }
      return { inner, logger, repository: new EncryptedAttachmentRepository(inner, cipher, logger) }
    }

    it('keeps the transaction in the list, marked as unavailable, without the value', async () => {
      const { repository } = broken()

      const [transaction] = await repository.findAllByUser('user-a')

      expect(transaction.id).toBe('7')
      expect(transaction.attachment).toBeUndefined()
      expect(transaction.toPrimitives()).toMatchObject({ attachmentUnavailable: true })
    })

    it('logs the id of the transaction and nothing else', async () => {
      const { logger, repository } = broken()

      await repository.findById('7', 'user-a')

      expect(logger.error).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({ code: 'UNREADABLE_DATA', message: 'Attachment could not be read: 7' }),
      )
    })

    it('keeps the other transactions readable', async () => {
      const { inner, repository } = broken()
      const sealed = await cipher.encrypt(Buffer.from('image/png\nabc'), 'user-a')
      await inner.create(aTransaction({ id: '8', attachment: sealed }))

      const list = await repository.findAllByUser('user-a')

      expect(list.find(item => item.id === '8')?.attachment).toBe('data:image/png;base64,YWJj')
    })

    it('keeps the stored value when another field is edited', async () => {
      const { inner, repository } = broken()
      const current = await repository.findById('7', 'user-a')

      await repository.update(current!.update({ amount: Money.fromCents(999) }))

      const stored = await inner.findById('7', 'user-a')
      expect(stored?.attachment).toBe('aes256gcm$v1$a$b$c')
      expect(stored?.amount.toCents()).toBe(999)
      expect(stored?.attachmentUnavailable).toBe(false)
    })

    it('can be replaced by a new attachment', async () => {
      const { repository } = broken()
      const current = await repository.findById('7', 'user-a')

      await repository.update(current!.update({ attachment: DATA_URL }))

      expect((await repository.findById('7', 'user-a'))?.attachment).toBe(DATA_URL)
    })

    it('can be deleted', async () => {
      const { repository } = broken()

      await repository.delete('7', 'user-a')

      await expect(repository.findAllByUser('user-a')).resolves.toEqual([])
    })

    it('reports a value in the clear the same way', async () => {
      const inner = new InMemoryTransactionRepository([aTransaction({ id: '7', attachment: DATA_URL })])

      const found = await new EncryptedAttachmentRepository(inner, cipher).findById('7', 'user-a')

      expect(found?.attachmentUnavailable).toBe(true)
    })

    it('does not open a sealed value moved to another owner', async () => {
      const { inner, repository } = setup()
      await repository.create(aTransaction({ attachment: DATA_URL }))
      const [stored] = await inner.findAllByUser('user-a')
      const moved = new InMemoryTransactionRepository([
        aTransaction({ id: '9', userId: 'user-b', attachment: stored.attachment }),
      ])

      const [transaction] = await new EncryptedAttachmentRepository(moved, cipher).findAllByUser('user-b')

      expect(transaction.attachment).toBeUndefined()
      expect(transaction.attachmentUnavailable).toBe(true)
    })
  })
})
