import { normalizeEmail } from '../../domain/user/User'
import { passwordResetEmail } from '../emails/passwordResetEmail'
import type { EmailSender } from '../ports/EmailSender'
import type { PasswordResetTokenRepository, ResetTokenGenerator } from '../ports/PasswordResetTokens'
import type { RateLimiter } from '../ports/RateLimiter'
import type { UserRepository } from '../ports/UserRepository'

export const RESET_TOKEN_MINUTES = 30

export interface RequestPasswordResetInput {
  email: string
  ip?: string
}

export interface RequestPasswordResetDependencies {
  users: UserRepository
  tokens: PasswordResetTokenRepository
  generator: ResetTokenGenerator
  emails: EmailSender
  limiters: { byEmail: RateLimiter; byIp: RateLimiter }
  resetUrl: (token: string) => string
  now?: () => number
}

// Ends the same way for an unknown email, a blocked one and a sent one: nothing tells them apart
export class RequestPasswordReset {
  constructor(private readonly dependencies: RequestPasswordResetDependencies) {}

  async execute({ email, ip }: RequestPasswordResetInput): Promise<void> {
    const { users, tokens, generator, emails, resetUrl, now = Date.now } = this.dependencies
    const normalizedEmail = normalizeEmail(email)
    if (!(await this.isAllowed(normalizedEmail, ip))) return

    const user = await users.findByEmail(normalizedEmail)
    if (!user) return

    await tokens.invalidateAllOfUser(user.id)
    const { token, tokenHash } = generator.generate()
    const expiresAt = now() + RESET_TOKEN_MINUTES * 60_000
    await tokens.create({ userId: user.id, tokenHash, expiresAt, used: false })
    await emails.send(passwordResetEmail(user.email, resetUrl(token), RESET_TOKEN_MINUTES))
  }

  private async isAllowed(email: string, ip: string | undefined): Promise<boolean> {
    const { limiters } = this.dependencies
    if (ip !== undefined && !(await limiters.byIp.consume(ip)).allowed) return false
    return (await limiters.byEmail.consume(email)).allowed
  }
}
