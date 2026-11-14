import type { User } from '../../domain/user/User'
import { normalizePassword } from '../../domain/user/passwordPolicy'
import { ApplicationError } from '../errors/ApplicationError'
import { RateLimitedError } from '../errors/RateLimitedError'
import type { CommonPasswordList } from '../ports/CommonPasswordList'
import type { PasswordHasher } from '../ports/PasswordHasher'
import type { RateLimiter } from '../ports/RateLimiter'
import type { UserRepository } from '../ports/UserRepository'
import { hashNewPassword } from './hashNewPassword'

export interface ChangePasswordInput {
  userId: string
  currentPassword: string
  newPassword: string
}

export interface ChangePasswordDependencies {
  users: UserRepository
  hasher: PasswordHasher
  commonPasswords: CommonPasswordList
  // The limiter of the login, by email: a wrong current password is a guess like a wrong login
  limiterByEmail: RateLimiter
  // The current instant, in ms: a new password ends every session, this one included
  now?: () => number
}

export class ChangePassword {
  constructor(private readonly dependencies: ChangePasswordDependencies) {}

  async execute({ userId, currentPassword, newPassword }: ChangePasswordInput): Promise<void> {
    const { users, hasher, commonPasswords, limiterByEmail } = this.dependencies

    const user = await users.findById(userId)
    if (!user) throw new ApplicationError('INVALID_CREDENTIALS', 'Invalid credentials')

    const limit = await limiterByEmail.consume(user.email)
    if (!limit.allowed) throw new RateLimitedError(limit.retryAfterMs)

    const matches = await this.verifyCurrent(user, currentPassword).catch(async (error: unknown) => {
      // The backend failed: nobody got the password wrong
      await limiterByEmail.release(user.email)
      throw error
    })
    if (!matches) throw new ApplicationError('INVALID_CURRENT_PASSWORD', 'Current password is not correct')
    await limiterByEmail.release(user.email)

    // Compared in NFKC, the form the hash was made from
    if (normalizePassword(newPassword) === normalizePassword(currentPassword)) {
      throw new ApplicationError('PASSWORD_UNCHANGED', 'New password is the current one')
    }

    // The same policy as the registration and the reset
    const passwordHash = await hashNewPassword(newPassword, user, commonPasswords, hasher)
    await users.updatePasswordHash(user.id, passwordHash)
    // Whoever had the old password, or a session made with it, is out on every device
    const { now = Date.now } = this.dependencies
    await users.updateSessionsValidAfter(user.id, now())
  }

  // The hasher compares in constant time
  private verifyCurrent(user: User, password: string): Promise<boolean> {
    return this.dependencies.hasher.verify(normalizePassword(password), user.passwordHash)
  }
}
