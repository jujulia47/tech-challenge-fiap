import { ApplicationError } from '../errors/ApplicationError'
import type { CommonPasswordList } from '../ports/CommonPasswordList'
import type { PasswordHasher } from '../ports/PasswordHasher'
import type { PasswordResetTokenRepository, ResetTokenGenerator } from '../ports/PasswordResetTokens'
import type { RateLimiter } from '../ports/RateLimiter'
import type { UserRepository } from '../ports/UserRepository'
import { hashNewPassword } from './hashNewPassword'

export interface ResetPasswordInput {
  token: string
  password: string
}

export interface ResetPasswordDependencies {
  users: UserRepository
  tokens: PasswordResetTokenRepository
  generator: ResetTokenGenerator
  hasher: PasswordHasher
  commonPasswords: CommonPasswordList
  loginLimiterByEmail: RateLimiter
  now?: () => number
}

// One failure for a token that is unknown, expired or used: the screen offers a new link for all
function invalidToken(): ApplicationError {
  return new ApplicationError('INVALID_RESET_TOKEN', 'Invalid password reset token')
}

export class ResetPassword {
  constructor(private readonly dependencies: ResetPasswordDependencies) {}

  async execute({ token, password }: ResetPasswordInput): Promise<void> {
    const { users, tokens, generator, hasher, commonPasswords, loginLimiterByEmail } = this.dependencies
    const { now = Date.now } = this.dependencies

    const stored = await tokens.findByHash(generator.hash(token))
    if (!stored || stored.used || stored.expiresAt <= now()) throw invalidToken()
    const user = await users.findById(stored.userId)
    if (!user) throw invalidToken()

    // The policy comes before using the token, so a refused password can try again with the same link
    const passwordHash = await hashNewPassword(password, user, commonPasswords, hasher)

    await users.updatePasswordHash(user.id, passwordHash)
    await tokens.markUsed(stored.id)
    await loginLimiterByEmail.reset(user.email)
  }
}
