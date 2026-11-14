import { isSessionRevoked } from '../../domain/user/sessionRevocation'
import type { UserRepository } from '../ports/UserRepository'

export interface VerifySessionInput {
  userId: string
  // When the session started: the login, in ms since the epoch
  sessionStartedAt: number | undefined
}

// Asked on every check of a session, by the three apps. One read of the user, no cache: a logout
// must hold at once in every app and instance. A user that no longer exists has no session.
export class VerifySession {
  constructor(private readonly users: UserRepository) {}

  async execute({ userId, sessionStartedAt }: VerifySessionInput): Promise<boolean> {
    const user = await this.users.findById(userId)
    if (!user) return false
    return !isSessionRevoked(sessionStartedAt, user.sessionsValidAfter)
  }
}
