import type { NextAuthConfig } from 'next-auth'
import { authLogger, readSessionPolicy } from '@bytebank/utils'

type Env = Record<string, string | undefined>

// The revocation of sessions on the server (docs/fase4/security.md, "Ending every session")
// Ending them is not here: the sign-out of Auth.js only clears the cookie of one browser (the
// inactivity logout), and "Sair" ends them all first, through POST /api/sessions/end of the shell.
export interface SessionChecks {
  // false when the user ended their sessions after this one started, or no longer exists
  isValid(userId: string, sessionStartedAt: number | undefined): Promise<boolean>
}

export interface BaseAuthOptions {
  // Reads the user again when the browser asks for a fresh session, after a profile change
  refreshUser?: (id: string) => Promise<{ name: string } | null>
  // Built on first use: `next build` loads the config and has no database
  sessions?: () => SessionChecks
  now?: () => number
}

// What every NextAuth instance shares. The shell adds the login provider; the zones only read
// the session, so all of them must agree on the secret, the policy and the shape of the token.
export function baseAuthConfig(env: Env, { refreshUser, sessions, now = Date.now }: BaseAuthOptions = {}): Omit<NextAuthConfig, 'providers'> {
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
          // The login, kept for the life of the session. Never the last renewal: Auth.js signs
          // the token again on every read, so iat moves and an old token would look new.
          token.sessionStartedAt = now()
          return token
        }
        // Every other read of the session is checked against the moment the user ended their
        // sessions. null makes Auth.js answer no session and clear the cookie.
        if (sessions && typeof token.id === 'string') {
          const startedAt = typeof token.sessionStartedAt === 'number' ? token.sessionStartedAt : undefined
          if (!(await sessions().isValid(token.id, startedAt))) return null
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
