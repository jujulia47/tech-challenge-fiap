// Only the hash is stored: a copy of the database gives no working link
export interface PasswordResetToken {
  id: string
  userId: string
  tokenHash: string
  expiresAt: number
  used: boolean
}

export interface PasswordResetTokenRepository {
  create(token: Omit<PasswordResetToken, 'id'>): Promise<void>
  findByHash(tokenHash: string): Promise<PasswordResetToken | null>
  markUsed(id: string): Promise<void>
  invalidateAllOfUser(userId: string): Promise<void>
}

export interface ResetTokenGenerator {
  generate(): { token: string; tokenHash: string }
  hash(token: string): string
}
