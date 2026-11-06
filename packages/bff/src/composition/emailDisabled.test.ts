import { User } from '@bytebank/core'
import { InMemoryPasswordResetTokenRepository, InMemoryTransactionRepository, InMemoryUserRepository } from '@bytebank/core/testing'
import { InMemoryRateLimiter } from '@bytebank/infrastructure'
import { describe, expect, it, vi } from 'vitest'
import { createPasswordResetHandlers } from '../http/createPasswordResetHandlers'
import { createAuthUseCases } from './createJsonServerAuthUseCases'
import type { DataAdapters } from './dataAdapters'

const ORIGIN = 'http://bff.test'
const EMAIL = 'ana@bytebank.com'

function setup() {
  const resetTokens = new InMemoryPasswordResetTokenRepository()
  const adapters: DataAdapters = {
    backend: 'json-server',
    users: new InMemoryUserRepository([User.create({ id: '1', name: 'Ana', email: EMAIL, passwordHash: 'hash' })]),
    transactions: new InMemoryTransactionRepository(),
    resetTokens,
    statistics: { summary: async () => ({ total: 0, types: [] }) },
    rateLimiter: (_namespace, options) => new InMemoryRateLimiter(options),
  }
  const log = vi.fn()
  const logger = { error: vi.fn() }
  const tasks: Promise<void>[] = []
  // No SMTP: what production runs
  const { requestPasswordReset, resetPassword } = createAuthUseCases({ adapters, resetUrl: token => `https://shell.test/redefinir-senha?token=${token}`, smtp: null, log })
  const handlers = createPasswordResetHandlers({ requestPasswordReset, resetPassword, allowedOrigins: [ORIGIN], defer: task => void tasks.push(task()), logger })
  const ask = async (email: string) => {
    const response = await handlers.request(new Request('http://bff.test/api/password-reset/request', { method: 'POST', headers: { Origin: ORIGIN }, body: JSON.stringify({ email }) }))
    await Promise.all(tasks.splice(0))
    return { status: response.status, body: await response.text() }
  }
  return { ask, log, logger, resetTokens }
}

describe('"Esqueci a senha" with the email turned off', () => {
  it('answers the generic message, the same for a known email and an unknown one', async () => {
    const { ask, logger } = setup()

    const known = await ask(EMAIL)
    const unknown = await ask('nobody@bytebank.com')

    expect(known).toEqual({ status: 202, body: '{"status":"ACCEPTED"}' })
    expect(unknown).toEqual(known)
    expect(logger.error).not.toHaveBeenCalled()
  })

  it('logs that the sending is off, once, with no address and no link', async () => {
    const { ask, log } = setup()

    await ask(EMAIL)

    expect(log).toHaveBeenCalledTimes(1)
    const [line] = log.mock.calls[0]
    expect(line).toContain('disabled')
    expect(line).not.toContain(EMAIL)
    expect(line).not.toContain('token')
  })

  it('still runs the reset as with email, so the time and the database behave the same', async () => {
    const { ask, resetTokens } = setup()

    await ask(EMAIL)

    expect(resetTokens.all()).toHaveLength(1)
  })
})
