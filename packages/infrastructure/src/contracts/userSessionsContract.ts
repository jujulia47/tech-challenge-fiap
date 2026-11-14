import { User, VerifySession } from '@bytebank/core'
import { describe, expect, it } from 'vitest'
import type { ContractContext } from './portContracts'

const TIMEOUT = { timeout: 20_000 }

// The moment a user ended their sessions (logout or new password): every backend stores it to
// the millisecond, keeps it across the other updates, and the rule of the core reads it back
export function describeUserSessionsContract(name: string, context: () => ContractContext): void {
  describe(`UserRepository sessions contract: ${name}`, TIMEOUT, () => {
    const newUser = (ctx: ContractContext) =>
      ctx.users.create(User.create({ id: ctx.id('user'), name: 'Contrato Sessões', email: `${ctx.id('mail')}@bytebank.test`, passwordHash: 'hash-of-test' }))

    it('a new user has never ended their sessions', async () => {
      const ctx = context()
      const created = await newUser(ctx)

      expect((await ctx.users.findById(created.id))?.sessionsValidAfter).toBeUndefined()
    })

    it('stores the moment to the millisecond, and a later one replaces it', async () => {
      const ctx = context()
      const created = await newUser(ctx)
      const first = Date.UTC(2026, 10, 14, 15, 30, 12, 345)

      await ctx.users.updateSessionsValidAfter(created.id, first)
      expect((await ctx.users.findById(created.id))?.sessionsValidAfter).toBe(first)
      expect((await ctx.users.findByEmail(created.email))?.sessionsValidAfter).toBe(first)

      await ctx.users.updateSessionsValidAfter(created.id, first + 1)
      expect((await ctx.users.findById(created.id))?.sessionsValidAfter).toBe(first + 1)
    })

    it('keeps it when the name or the password change, and keeps them when it changes', async () => {
      const ctx = context()
      const created = await newUser(ctx)
      const ended = Date.UTC(2026, 10, 14, 15, 30, 0, 0)

      await ctx.users.updateSessionsValidAfter(created.id, ended)
      await ctx.users.updateName(created.id, 'Nome Novo')
      await ctx.users.updatePasswordHash(created.id, 'hash-of-new')

      const stored = await ctx.users.findById(created.id)
      expect([stored?.name, stored?.passwordHash, stored?.sessionsValidAfter]).toEqual(['Nome Novo', 'hash-of-new', ended])
    })

    it('refuses, through the rule of the core, a session that started before the moment', async () => {
      const ctx = context()
      const created = await newUser(ctx)
      const ended = Date.UTC(2026, 10, 14, 16, 0, 0, 0)
      const verify = new VerifySession(ctx.users)

      await ctx.users.updateSessionsValidAfter(created.id, ended)

      await expect(verify.execute({ userId: created.id, sessionStartedAt: ended - 1 })).resolves.toBe(false)
      await expect(verify.execute({ userId: created.id, sessionStartedAt: ended })).resolves.toBe(true)
    })
  })
}
