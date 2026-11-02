import { ApplicationError } from '../errors/ApplicationError'
import type { UserRepository } from '../ports/UserRepository'
import type { UserDTO } from '../UserDTO'

export interface UpdateUserProfileInput {
  userId: string
  name: string
}

export class UpdateUserProfile {
  constructor(private readonly users: UserRepository) {}

  async execute({ userId, name }: UpdateUserProfileInput): Promise<UserDTO> {
    const user = await this.users.findById(userId)
    // A session for a user that no longer exists: the same answer as a failed login
    if (!user) throw new ApplicationError('INVALID_CREDENTIALS', 'Invalid credentials')

    // The rule of the name lives in the entity, so a profile and a registration agree
    const renamed = user.withName(name)
    await this.users.updateName(renamed.id, renamed.name)
    return renamed.toDTO()
  }
}
