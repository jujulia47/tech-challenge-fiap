import type { PasswordResetToken, PasswordResetTokenRepository } from '../application/ports/PasswordResetTokens'

export class InMemoryPasswordResetTokenRepository implements PasswordResetTokenRepository {
  private readonly items: PasswordResetToken[] = []

  all(): readonly PasswordResetToken[] {
    return this.items
  }

  async create(token: Omit<PasswordResetToken, 'id'>): Promise<void> {
    this.items.push({ ...token, id: `reset-${this.items.length + 1}` })
  }

  async findByHash(tokenHash: string): Promise<PasswordResetToken | null> {
    return this.items.find(item => item.tokenHash === tokenHash) ?? null
  }

  async markUsed(id: string): Promise<void> {
    for (const item of this.items) if (item.id === id) item.used = true
  }

  async invalidateAllOfUser(userId: string): Promise<void> {
    for (const item of this.items) if (item.userId === userId) item.used = true
  }
}
