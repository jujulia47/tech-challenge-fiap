import { User } from '../../domain/user/User'
import { ApplicationError } from '../errors/ApplicationError'
import { RateLimitedError } from '../errors/RateLimitedError'
import type { IdGenerator } from '../ports/IdGenerator'
import type { CommonPasswordList } from '../ports/CommonPasswordList'
import type { PasswordHasher } from '../ports/PasswordHasher'
import type { RateLimiter } from '../ports/RateLimiter'
import type { UserRepository } from '../ports/UserRepository'
import type { UserDTO } from '../UserDTO'
import { hashNewPassword } from './hashNewPassword'

export interface RegisterUserInput {
  name: string
  email: string
  password: string
  ip?: string
}

export class RegisterUser {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly ids: IdGenerator,
    private readonly limiterByIp: RateLimiter,
    private readonly commonPasswords: CommonPasswordList,
  ) {}

  async execute({ name, email, password, ip }: RegisterUserInput): Promise<UserDTO> {
    const limit = ip === undefined ? null : await this.limiterByIp.consume(ip)
    if (limit && !limit.allowed) throw new RateLimitedError(limit.retryAfterMs)

    // Hashes before the lookup, so that a registered email does not answer faster
    const passwordHash = await hashNewPassword(password, { name, email }, this.commonPasswords, this.hasher)
    const user = User.create({ id: this.ids.next(), name, email, passwordHash })

    if (await this.users.findByEmail(user.email)) {
      throw new ApplicationError('EMAIL_ALREADY_REGISTERED', 'Email already registered')
    }
    const created = await this.users.create(user)
    return created.toDTO()
  }
}
