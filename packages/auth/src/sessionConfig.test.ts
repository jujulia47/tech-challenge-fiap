import type { NextAuthConfig } from 'next-auth'
import { SESSION_POLICY } from '@bytebank/utils'
import { describe, expect, it, vi } from 'vitest'
import { baseAuthConfig } from './sessionConfig'

type Callbacks = NonNullable<NextAuthConfig['callbacks']>
type JwtArgs = Parameters<NonNullable<Callbacks['jwt']>>[0]
type SessionArgs = Parameters<NonNullable<Callbacks['session']>>[0]

const user = { id: '1', name: 'Joana Silva', email: 'joana@exemplo.com' }

describe('baseAuthConfig', () => {
  it('takes the secret from the environment and keeps the login at the root of the shell', () => {
    const config = baseAuthConfig({ NEXTAUTH_SECRET: 'segredo-de-teste' })

    expect(config.secret).toBe('segredo-de-teste')
    expect(config.pages?.signIn).toBe('/')
    expect(config.trustHost).toBe(true)
  })

  it('uses the session policy, so the shell and the zones expire together', () => {
    expect(baseAuthConfig({}).session).toEqual({
      strategy: 'jwt',
      maxAge: SESSION_POLICY.maxAgeSeconds,
      updateAge: SESSION_POLICY.updateAgeSeconds,
    })
    expect(baseAuthConfig({ SESSION_MAX_AGE_SECONDS: '60' }).session?.maxAge).toBe(60)
  })

  it('puts the user in the token at login', async () => {
    const jwt = baseAuthConfig({}).callbacks?.jwt

    const token = await jwt?.({ token: {}, user } as unknown as JwtArgs)

    expect(token).toMatchObject(user)
  })

  it('keeps the token when there is no new login', async () => {
    const jwt = baseAuthConfig({}).callbacks?.jwt
    const token = { id: '1', name: 'Joana Silva', email: 'joana@exemplo.com' }

    expect(await jwt?.({ token } as unknown as JwtArgs)).toEqual(token)
  })

  it('gives the session the id, the name and the email of the token', async () => {
    const session = baseAuthConfig({}).callbacks?.session

    const result = await session?.({
      session: { user: { id: '', name: '', email: '' }, expires: '' },
      token: { id: '1', name: 'Joana Silva', email: 'joana@exemplo.com' },
    } as unknown as SessionArgs)

    expect(result).toMatchObject({ user })
  })

  describe('a refresh of the session', () => {
    const token = { id: '1', name: 'Joana Silva', email: 'joana@exemplo.com' }

    it('reads the name again from the store', async () => {
      const refreshUser = vi.fn(async () => ({ name: 'Joana Souza' }))
      const jwt = baseAuthConfig({}, { refreshUser }).callbacks?.jwt

      const result = await jwt?.({ token: { ...token }, trigger: 'update' } as unknown as JwtArgs)

      expect(refreshUser).toHaveBeenCalledWith('1')
      expect(result).toMatchObject({ id: '1', name: 'Joana Souza', email: 'joana@exemplo.com' })
    })

    it('ignores what the browser sends with the refresh', async () => {
      const refreshUser = vi.fn(async () => ({ name: 'Joana Souza' }))
      const jwt = baseAuthConfig({}, { refreshUser }).callbacks?.jwt

      const result = await jwt?.({ token: { ...token }, trigger: 'update', session: { name: 'Outro Nome', id: '2' } } as unknown as JwtArgs)

      expect(result).toMatchObject({ id: '1', name: 'Joana Souza' })
    })

    it('keeps the token when the user is gone, or when nothing refreshes', async () => {
      const gone = baseAuthConfig({}, { refreshUser: async () => null }).callbacks?.jwt
      const none = baseAuthConfig({}).callbacks?.jwt

      expect(await gone?.({ token: { ...token }, trigger: 'update' } as unknown as JwtArgs)).toEqual(token)
      expect(await none?.({ token: { ...token }, trigger: 'update' } as unknown as JwtArgs)).toEqual(token)
    })

    it('does not read the store on an ordinary request', async () => {
      const refreshUser = vi.fn(async () => ({ name: 'Joana Souza' }))

      await baseAuthConfig({}, { refreshUser }).callbacks?.jwt?.({ token: { ...token } } as unknown as JwtArgs)

      expect(refreshUser).not.toHaveBeenCalled()
    })
  })
})
