import type { UserRepository } from '../application/ports/UserRepository'
import { User } from '../domain/user/User'

export class InMemoryUserRepository implements UserRepository {
  private readonly items = new Map<string, User>()

  constructor(initial: readonly User[] = []) {
    for (const user of initial) this.items.set(user.email, user)
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.items.get(email) ?? null
  }

  async findById(id: string): Promise<User | null> {
    return [...this.items.values()].find(user => user.id === id) ?? null
  }

  async updatePasswordHash(id: string, passwordHash: string): Promise<void> {
    const user = await this.findById(id)
    if (user) this.items.set(user.email, User.create({ ...user.toRecord(), passwordHash }))
  }

  async updateName(id: string, name: string): Promise<void> {
    const user = await this.findById(id)
    if (user) this.items.set(user.email, user.withName(name))
  }

  async create(user: User): Promise<User> {
    this.items.set(user.email, user)
    return user
  }
}
