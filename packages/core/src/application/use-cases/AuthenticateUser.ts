import type { User } from '../../domain/user/User'
import { normalizePassword } from '../../domain/user/passwordPolicy'
import { normalizeEmail } from '../../domain/user/User'
import { ApplicationError } from '../errors/ApplicationError'
import { RateLimitedError } from '../errors/RateLimitedError'
import type { PasswordHasher } from '../ports/PasswordHasher'
import type { RateLimiter, RateLimitResult } from '../ports/RateLimiter'
import type { UserRepository } from '../ports/UserRepository'
import type { UserDTO } from '../UserDTO'

const DECOY_PASSWORD = 'decoy-password-that-belongs-to-nobody'

export interface AuthenticateUserInput {
  email: string
  password: string
  ip?: string
}

export interface LoginRateLimiters {
  byEmail: RateLimiter
  byIp: RateLimiter
}

// One failure for a wrong password and an unknown email: same code, same message
function invalidCredentials(): ApplicationError {
  return new ApplicationError('INVALID_CREDENTIALS', 'Invalid credentials')
}

export class AuthenticateUser {
  // Verified when the user does not exist, so that both failures take the same time
  private readonly decoyHash: Promise<string>

  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly limiters: LoginRateLimiters,
  ) {
    this.decoyHash = hasher.hash(DECOY_PASSWORD)
  }

  async execute({ email, password, ip }: AuthenticateUserInput): Promise<UserDTO> {
    const normalizedEmail = normalizeEmail(email)
    // Before the lookup: the block cannot depend on whether the email exists
    const limit = await this.consume(normalizedEmail, ip)
    if (!limit.allowed) throw new RateLimitedError(limit.retryAfterMs)

    const user = await this.verify(normalizedEmail, password).catch(async (error: unknown) => {
      // The backend failed: nobody got the password wrong
      await this.release(normalizedEmail, ip)
      throw error
    })
    if (!user) throw invalidCredentials()

    await this.release(normalizedEmail, ip)
    return user.toDTO()
  }

  private async consume(email: string, ip: string | undefined): Promise<RateLimitResult> {
    if (ip !== undefined) {
      const byIp = await this.limiters.byIp.consume(ip)
      if (!byIp.allowed) return byIp
    }
    return this.limiters.byEmail.consume(email)
  }

  private async release(email: string, ip: string | undefined): Promise<void> {
    await this.limiters.byEmail.release(email)
    if (ip !== undefined) await this.limiters.byIp.release(ip)
  }

  private async verify(email: string, password: string): Promise<User | null> {
    const user = await this.users.findByEmail(email)
    // New passwords are hashed in NFKC, so the login must compare in NFKC too
    const candidate = normalizePassword(password)
    const matches = await this.hasher.verify(candidate, user?.passwordHash ?? (await this.decoyHash))
    return matches ? user : null
  }
}
