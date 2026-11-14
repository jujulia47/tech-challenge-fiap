import { EndUserSessions, VerifySession, type UserRepository } from '@bytebank/core'
import { createDataAdapters } from './dataAdapters'

// What the session config of the three apps needs: refuse a session that started before the
// user ended their sessions, and record that moment on logout. docs/fase4/security.md
export interface SessionRevocation {
  isValid(userId: string, sessionStartedAt: number | undefined): Promise<boolean>
  endAll(userId: string): Promise<void>
}

export function createSessionRevocation(users: UserRepository, now: () => number = Date.now): SessionRevocation {
  const verify = new VerifySession(users)
  const end = new EndUserSessions(users, now)
  return {
    isValid: (userId, sessionStartedAt) => verify.execute({ userId, sessionStartedAt }),
    endAll: userId => end.execute({ userId }),
  }
}

// On globalThis: Next.js may load a module once per route, and there is no need for more than
// one set of adapters per process. Built on the first call: `next build` has no variables.
const shared = globalThis as typeof globalThis & { bytebankSessionRevocation?: SessionRevocation }

export function getSessionRevocation(): SessionRevocation {
  shared.bytebankSessionRevocation ??= createSessionRevocation(createDataAdapters().users)
  return shared.bytebankSessionRevocation
}
