import { ApplicationError } from '../application/errors/ApplicationError'
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

  // A token is claimed once, as the adapters do
  async markUsed(id: string): Promise<void> {
    const item = this.items.find(candidate => candidate.id === id)
    if (!item || item.used) throw new ApplicationError('INVALID_RESET_TOKEN', 'Invalid password reset token')
    item.used = true
  }

  async invalidateAllOfUser(userId: string): Promise<void> {
    for (const item of this.items) if (item.userId === userId) item.used = true
  }
}
