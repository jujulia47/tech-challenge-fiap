import {
  ApplicationError,
  Transaction,
  User,
  type PasswordResetTokenRepository,
  type TransactionRepository,
  type TransactionStatistics,
  type UserRepository,
} from '@bytebank/core'
import { describe, expect, it } from 'vitest'

// The same expectations for every adapter of a port. A backend that cannot hold a guarantee,
// such as json-server under concurrency, says so in its capabilities and the case is skipped.
export interface Capabilities {
  uniqueEmail: boolean
  atomicClaim: boolean
}

export interface ContractContext {
  users: UserRepository
  transactions: TransactionRepository
  resetTokens: PasswordResetTokenRepository
  statistics: TransactionStatistics
  // Fresh ids and emails for each test, so runs never collide
  id: (label: string) => string
  // Two users that already exist, for the ports that belong to a user
  owners: () => { a: string; b: string }
}

const TIMEOUT = { timeout: 20_000 }
const userWith = (id: string, email: string) => User.create({ id, name: 'Contrato Teste', email, passwordHash: 'hash-of-test' })
const transactionOf = (id: string, userId: string, attachment?: string) =>
  Transaction.fromPrimitives({ id, userId, type: 'deposit', amountInCents: 1500, date: '2026-03-01', ...(attachment ? { attachment } : {}) })

export function describeUserRepositoryContract(name: string, context: () => ContractContext, capabilities: Capabilities): void {
  describe(`UserRepository contract: ${name}`, TIMEOUT, () => {
    it('creates a user and finds it by email and by id, never with the hash out of the record', async () => {
      const { users, id } = context()
      const created = await users.create(userWith(id('user'), `${id('mail')}@bytebank.test`))

      expect((await users.findByEmail(created.email))?.toDTO()).toEqual(created.toDTO())
      expect((await users.findById(created.id))?.passwordHash).toBe('hash-of-test')
    })

    it('finds nothing for an unknown email or id', async () => {
      const { users, id } = context()

      await expect(users.findByEmail(`${id('nobody')}@bytebank.test`)).resolves.toBeNull()
      await expect(users.findById(id('nobody'))).resolves.toBeNull()
    })

    it('changes the name and the password, one at a time', async () => {
      const { users, id } = context()
      const created = await users.create(userWith(id('user'), `${id('mail')}@bytebank.test`))

      await users.updateName(created.id, 'Nome Novo')
      await users.updatePasswordHash(created.id, 'hash-of-new')

      const stored = await users.findById(created.id)
      expect([stored?.name, stored?.passwordHash]).toEqual(['Nome Novo', 'hash-of-new'])
    })

    it.skipIf(!capabilities.uniqueEmail)('refuses a second user with the same email, as already registered', async () => {
      const { users, id } = context()
      const email = `${id('mail')}@bytebank.test`
      await users.create(userWith(id('first'), email))

      await expect(users.create(userWith(id('second'), email))).rejects.toMatchObject({ code: 'EMAIL_ALREADY_REGISTERED' })
    })

    it.skipIf(!capabilities.uniqueEmail)('lets only one of two registrations at the same time through', async () => {
      const { users, id } = context()
      const email = `${id('mail')}@bytebank.test`

      const results = await Promise.allSettled([users.create(userWith(id('one'), email)), users.create(userWith(id('two'), email))])

      expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1)
      expect(results.find(result => result.status === 'rejected')).toMatchObject({ reason: expect.any(ApplicationError) })
    })
  })
}

export function describeTransactionRepositoryContract(name: string, context: () => ContractContext): void {
  describe(`TransactionRepository contract: ${name}`, TIMEOUT, () => {
    it('stores a transaction, with its attachment, and lists it only for its owner', async () => {
      const { transactions, id, owners } = context()
      const { a, b } = owners()
      const created = await transactions.create(transactionOf(id('tx'), a, 'v1:cifrado'))

      const ofA = await transactions.findAllByUser(a)
      expect(ofA.find(item => item.id === created.id)?.toPrimitives()).toMatchObject({ userId: a, amountInCents: 1500, date: '2026-03-01', attachment: 'v1:cifrado' })
      expect((await transactions.findAllByUser(b)).some(item => item.id === created.id)).toBe(false)
    })

    it('finds by id for the owner and returns null for another user', async () => {
      const { transactions, id, owners } = context()
      const { a, b } = owners()
      const created = await transactions.create(transactionOf(id('tx'), a))

      expect((await transactions.findById(created.id, a))?.id).toBe(created.id)
      await expect(transactions.findById(created.id, b)).resolves.toBeNull()
      await expect(transactions.findById(id('missing'), a)).resolves.toBeNull()
    })

    it('updates, and removes the attachment', async () => {
      const { transactions, id, owners } = context()
      const { a } = owners()
      const created = await transactions.create(transactionOf(id('tx'), a, 'v1:cifrado'))
      const changed = Transaction.fromPrimitives({ ...created.toPrimitives(), amountInCents: 9900, attachment: undefined })

      await transactions.update(changed)

      const stored = await transactions.findById(created.id, a)
      expect([stored?.amount.toCents(), stored?.attachment]).toEqual([9900, undefined])
    })

    it('refuses to update or delete a transaction of another user, as not found', async () => {
      const { transactions, id, owners } = context()
      const { a, b } = owners()
      const created = await transactions.create(transactionOf(id('tx'), a))
      const stolen = Transaction.fromPrimitives({ ...created.toPrimitives(), userId: b })

      await expect(transactions.update(stolen)).rejects.toMatchObject({ code: 'TRANSACTION_NOT_FOUND' })
      await expect(transactions.delete(created.id, b)).rejects.toMatchObject({ code: 'TRANSACTION_NOT_FOUND' })
      expect(await transactions.findById(created.id, a)).not.toBeNull()
    })

    it('counts it in the numbers of the bank, by type, without any user', async () => {
      const { transactions, statistics, id, owners } = context()
      const before = await statistics.summary()
      await transactions.create(Transaction.fromPrimitives({ id: id('tx'), userId: owners().a, type: 'loan', amountInCents: 100, date: '2026-03-01' }))

      const after = await statistics.summary()

      expect(after.total).toBe(before.total + 1)
      expect(after.types).toContain('loan')
    })

    it('deletes a transaction of the owner', async () => {
      const { transactions, id, owners } = context()
      const { a } = owners()
      const created = await transactions.create(transactionOf(id('tx'), a))

      await transactions.delete(created.id, a)

      await expect(transactions.findById(created.id, a)).resolves.toBeNull()
    })
  })
}

export function describeResetTokenContract(name: string, context: () => ContractContext, capabilities: Capabilities): void {
  describe(`PasswordResetTokenRepository contract: ${name}`, TIMEOUT, () => {
    const create = async ({ resetTokens, id, owners }: ContractContext, userId = owners().a) => {
      const tokenHash = id('hash')
      await resetTokens.create({ userId, tokenHash, expiresAt: Date.now() + 30 * 60_000, used: false })
      const stored = await resetTokens.findByHash(tokenHash)
      if (!stored) throw new Error('the token was not stored')
      return stored
    }

    it('stores the hash and finds it, open and with its validity', async () => {
      const stored = await create(context())

      expect(stored.used).toBe(false)
      expect(stored.expiresAt).toBeGreaterThan(Date.now())
    })

    it('claims a token once: the second claim is a used link', async () => {
      const ctx = context()
      const stored = await create(ctx)

      await ctx.resetTokens.markUsed(stored.id)

      await expect(ctx.resetTokens.markUsed(stored.id)).rejects.toMatchObject({ code: 'INVALID_RESET_TOKEN' })
      expect((await ctx.resetTokens.findByHash(stored.tokenHash))?.used).toBe(true)
    })

    it.skipIf(!capabilities.atomicClaim)('lets only one of two claims at the same time through', async () => {
      const ctx = context()
      const stored = await create(ctx)

      const results = await Promise.allSettled([ctx.resetTokens.markUsed(stored.id), ctx.resetTokens.markUsed(stored.id)])

      expect(results.map(result => result.status).sort()).toEqual(['fulfilled', 'rejected'])
    })

    it('closes every open token of the user, and only of that user', async () => {
      const ctx = context()
      const { a, b } = ctx.owners()
      const mine = await create(ctx, a)
      const other = await create(ctx, b)

      await ctx.resetTokens.invalidateAllOfUser(a)

      expect((await ctx.resetTokens.findByHash(mine.tokenHash))?.used).toBe(true)
      expect((await ctx.resetTokens.findByHash(other.tokenHash))?.used).toBe(false)
    })
  })
}
