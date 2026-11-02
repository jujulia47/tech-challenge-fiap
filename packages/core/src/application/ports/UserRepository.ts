import type { User } from '../../domain/user/User'

export interface UserRepository {
  findByEmail(email: string): Promise<User | null>
  findById(id: string): Promise<User | null>
  updatePasswordHash(id: string, passwordHash: string): Promise<void>
  updateName(id: string, name: string): Promise<void>
  // Returns what was stored: a backend may assign its own id (json-server does)
  create(user: User): Promise<User>
}
