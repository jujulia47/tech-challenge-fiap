import type { UserRepository } from '../ports/UserRepository'

export interface EndUserSessionsInput {
  userId: string
}

// The logout of one session ends all of them: the server records the moment, so a copy of the
// cookie, another device or a late response that writes the old cookie back is refused too
export class EndUserSessions {
  constructor(
    private readonly users: UserRepository,
    private readonly now: () => number = Date.now,
  ) {}

  async execute({ userId }: EndUserSessionsInput): Promise<void> {
    await this.users.updateSessionsValidAfter(userId, this.now())
  }
}
