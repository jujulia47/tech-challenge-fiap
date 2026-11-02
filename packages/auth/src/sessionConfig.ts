import type { NextAuthConfig } from 'next-auth'
import { authLogger, readSessionPolicy } from '@bytebank/utils'

type Env = Record<string, string | undefined>

export interface BaseAuthOptions {
  // Reads the user again when the browser asks for a fresh session, after a profile change
  refreshUser?: (id: string) => Promise<{ name: string } | null>
}

// What every NextAuth instance shares. The shell adds the login provider; the zones only read
// the session, so all of them must agree on the secret, the policy and the shape of the token.
export function baseAuthConfig(env: Env, { refreshUser }: BaseAuthOptions = {}): Omit<NextAuthConfig, 'providers'> {
  const { maxAgeSeconds, updateAgeSeconds } = readSessionPolicy(env)

  return {
    secret: env.NEXTAUTH_SECRET,
    trustHost: true,
    logger: authLogger,
    session: { strategy: 'jwt', maxAge: maxAgeSeconds, updateAge: updateAgeSeconds },
    pages: {
      signIn: '/',
    },
    callbacks: {
      async jwt({ token, user, trigger }) {
        if (user) {
          token.id = user.id
          token.name = user.name
          token.email = user.email
        }
        // The browser only asks for the refresh. The name comes from the store, never from the
        // request, so nobody can write what they want into their own token.
        if (trigger === 'update' && refreshUser && typeof token.id === 'string') {
          const fresh = await refreshUser(token.id)
          if (fresh) token.name = fresh.name
        }
        return token
      },
      async session({ session, token }) {
        if (session.user) {
          session.user.id = token.id as string
          session.user.name = token.name as string
          session.user.email = token.email as string
        }
        return session
      },
    },
  }
}
