import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { User } from '../../domain/user/User'
import { FakeCommonPasswordList } from '../../testing/FakeCommonPasswordList'
import { FakeEmailSender } from '../../testing/FakeEmailSender'
import { FakePasswordHasher } from '../../testing/FakePasswordHasher'
import { FakeRateLimiter } from '../../testing/FakeRateLimiter'
import { FakeResetTokenGenerator } from '../../testing/FakeResetTokenGenerator'
import { InMemoryPasswordResetTokenRepository } from '../../testing/InMemoryPasswordResetTokenRepository'
import { InMemoryUserRepository } from '../../testing/InMemoryUserRepository'
import { RequestPasswordReset, RESET_TOKEN_MINUTES } from './RequestPasswordReset'
import { ResetPassword } from './ResetPassword'

const EMAIL = 'ana@bytebank.com'
const STRONG = 'correct horse battery staple'
const user = User.create({ id: '1', name: 'Ana', email: EMAIL, passwordHash: 'hashed:old' })

function setup({ byEmail = new FakeRateLimiter(), byIp = new FakeRateLimiter() } = {}) {
  const users = new InMemoryUserRepository([user])
  const tokens = new InMemoryPasswordResetTokenRepository()
  const generator = new FakeResetTokenGenerator()
  const emails = new FakeEmailSender()
  const loginLimiterByEmail = new FakeRateLimiter()
  const request = new RequestPasswordReset({
    users,
    tokens,
    generator,
    emails,
    limiters: { byEmail, byIp },
    resetUrl: token => `https://app.test/redefinir-senha?token=${token}`,
  })
  const reset = new ResetPassword({
    users,
    tokens,
    generator,
    hasher: new FakePasswordHasher(),
    commonPasswords: new FakeCommonPasswordList(['commonpasswordlisted']),
    loginLimiterByEmail,
  })
  return { users, tokens, emails, loginLimiterByEmail, request, reset, byEmail, byIp }
}

const tokenOf = (link: string | undefined) => new URL(String(link)).searchParams.get('token') ?? ''
const linkIn = (text: string | undefined) => /https:\S+/.exec(String(text))?.[0]

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('RequestPasswordReset', () => {
  it('sends an email in Portuguese with the link and the validity', async () => {
    const { emails, request } = setup()

    await request.execute({ email: 'ANA@bytebank.com' })

    expect(emails.sent).toHaveLength(1)
    const [message] = emails.sent
    expect(message.to).toBe(EMAIL)
    expect(message.subject).toBe('Redefinição de senha do Bytebank')
    expect(message.text).toContain('https://app.test/redefinir-senha?token=token-1')
    expect(message.html).toContain('href="https://app.test/redefinir-senha?token=token-1"')
    expect(message.text).toContain('30 minutos')
  })

  it('stores only the hash, with 30 minutes of validity', async () => {
    const { tokens, request } = setup()

    await request.execute({ email: EMAIL })

    expect(tokens.all()).toEqual([
      expect.objectContaining({
        userId: '1',
        tokenHash: 'hash-of:token-1',
        expiresAt: Date.now() + RESET_TOKEN_MINUTES * 60_000,
        used: false,
      }),
    ])
  })

  it('ends the same way for an unknown email, with nothing sent or stored', async () => {
    const { emails, tokens, request } = setup()

    await expect(request.execute({ email: 'nobody@bytebank.com' })).resolves.toBeUndefined()

    expect(emails.sent).toEqual([])
    expect(tokens.all()).toEqual([])
  })

  it.each([
    ['email', { byEmail: new FakeRateLimiter(0) }],
    ['IP', { byIp: new FakeRateLimiter(0) }],
  ])('blocked by %s: ends the same way and sends nothing', async (_, limiters) => {
    const { emails, request } = setup(limiters)

    await expect(request.execute({ email: EMAIL, ip: '10.0.0.1' })).resolves.toBeUndefined()

    expect(emails.sent).toEqual([])
  })

  it('counts unknown emails too', async () => {
    const byEmail = new FakeRateLimiter()
    const { request } = setup({ byEmail })

    await request.execute({ email: 'nobody@bytebank.com' })

    expect(byEmail.consumed).toEqual(['nobody@bytebank.com'])
  })
})

describe('ResetPassword', () => {
  async function requested(context: ReturnType<typeof setup>): Promise<string> {
    await context.request.execute({ email: EMAIL })
    return tokenOf(linkIn(context.emails.sent.at(-1)?.text))
  }

  it('saves the new hash, normalized, marks the token and frees the login', async () => {
    const context = setup()
    const token = await requested(context)

    await context.reset.execute({ token, password: STRONG })

    expect((await context.users.findById('1'))?.passwordHash).toBe(`hashed:${STRONG}`)
    expect(context.tokens.all()[0].used).toBe(true)
    expect(context.loginLimiterByEmail.resetKeys).toEqual([EMAIL])
  })

  it('changes nothing when another call claimed the same link first', async () => {
    const context = setup()
    const token = await requested(context)
    // Both calls read the token as open; the other one wins the claim in between
    const open = context.tokens.all()[0]
    const findByHash = context.tokens.findByHash.bind(context.tokens)
    context.tokens.findByHash = async hash => {
      const found = await findByHash(hash)
      await context.tokens.markUsed(open.id)
      return found && { ...found, used: false }
    }

    await expect(context.reset.execute({ token, password: STRONG })).rejects.toMatchObject({ code: 'INVALID_RESET_TOKEN' })
    expect((await context.users.findById('1'))?.passwordHash).toBe('hashed:old')
    expect(context.loginLimiterByEmail.resetKeys).toEqual([])
  })

  it('refuses an unknown token', async () => {
    await expect(setup().reset.execute({ token: 'invented', password: STRONG })).rejects.toMatchObject({
      code: 'INVALID_RESET_TOKEN',
    })
  })

  it('accepts the last moment and refuses an expired token', async () => {
    const context = setup()
    const token = await requested(context)

    vi.advanceTimersByTime(RESET_TOKEN_MINUTES * 60_000)

    await expect(context.reset.execute({ token, password: STRONG })).rejects.toMatchObject({
      code: 'INVALID_RESET_TOKEN',
    })
  })

  it('accepts a token just before it expires', async () => {
    const context = setup()
    const token = await requested(context)

    vi.advanceTimersByTime(RESET_TOKEN_MINUTES * 60_000 - 1)

    await expect(context.reset.execute({ token, password: STRONG })).resolves.toBeUndefined()
  })

  it('refuses a token already used', async () => {
    const context = setup()
    const token = await requested(context)
    await context.reset.execute({ token, password: STRONG })

    await expect(context.reset.execute({ token, password: `${STRONG} again` })).rejects.toMatchObject({
      code: 'INVALID_RESET_TOKEN',
    })
  })

  it('refuses the previous token after a new request', async () => {
    const context = setup()
    const first = await requested(context)
    const second = await requested(context)

    await expect(context.reset.execute({ token: first, password: STRONG })).rejects.toMatchObject({
      code: 'INVALID_RESET_TOKEN',
    })
    await expect(context.reset.execute({ token: second, password: STRONG })).resolves.toBeUndefined()
  })

  it('refuses a token whose user no longer exists', async () => {
    const context = setup()
    await context.tokens.create({ userId: 'gone', tokenHash: 'hash-of:lost', expiresAt: Date.now() + 1, used: false })

    await expect(context.reset.execute({ token: 'lost', password: STRONG })).rejects.toMatchObject({
      code: 'INVALID_RESET_TOKEN',
    })
  })

  it.each([
    ['short', 'curta', 'PASSWORD_TOO_SHORT'],
    ['common', 'common password listed', 'PASSWORD_TOO_COMMON'],
    ['with the name of the person', 'a senha da ana aqui e longa', 'PASSWORD_HAS_PERSONAL_CONTEXT'],
  ])('keeps the old password and the link on a %s password', async (_, password, code) => {
    const context = setup()
    const token = await requested(context)

    await expect(context.reset.execute({ token, password })).rejects.toMatchObject({ code })

    expect((await context.users.findById('1'))?.passwordHash).toBe('hashed:old')
    await expect(context.reset.execute({ token, password: STRONG })).resolves.toBeUndefined()
  })
})
