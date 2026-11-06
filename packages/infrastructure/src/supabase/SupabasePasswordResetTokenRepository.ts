import { ApplicationError, type PasswordResetToken, type PasswordResetTokenRepository } from '@bytebank/core'
import { databaseError, invalidResponse, type SupabaseDatabase } from './database'

const TABLE = 'password_reset_tokens'
const COLUMNS = 'id, user_id, token_hash, expires_at, used_at'

interface TokenRow {
  id: string
  user_id: string
  token_hash: string
  expires_at: string
  used_at: string | null
}

function isTokenRow(value: unknown): value is TokenRow {
  const row = value as Partial<Record<keyof TokenRow, unknown>> | null
  return (
    [row?.id, row?.user_id, row?.token_hash, row?.expires_at].every(field => typeof field === 'string') &&
    (row?.used_at === null || typeof row?.used_at === 'string')
  )
}

function tokenFrom(value: unknown): PasswordResetToken {
  if (!isTokenRow(value)) throw invalidResponse('read reset token')
  const expiresAt = Date.parse(value.expires_at)
  if (Number.isNaN(expiresAt)) throw invalidResponse('read reset token')
  return { id: value.id, userId: value.user_id, tokenHash: value.token_hash, expiresAt, used: value.used_at !== null }
}

export class SupabasePasswordResetTokenRepository implements PasswordResetTokenRepository {
  constructor(private readonly database: SupabaseDatabase) {}

  async create({ userId, tokenHash, expiresAt, used }: Omit<PasswordResetToken, 'id'>): Promise<void> {
    const { error, status } = await this.database.from(TABLE).insert({
      user_id: userId,
      token_hash: tokenHash,
      expires_at: new Date(expiresAt).toISOString(),
      used_at: used ? new Date().toISOString() : null,
    })
    if (error) throw databaseError('create reset token', error, status)
  }

  async findByHash(tokenHash: string): Promise<PasswordResetToken | null> {
    const { data, error, status } = await this.database
      .from(TABLE)
      .select(COLUMNS)
      .eq('token_hash', tokenHash)
      .maybeSingle()
    if (error) throw databaseError('find reset token', error, status)
    return data === null ? null : tokenFrom(data)
  }

  // A function in the database claims the token in one statement: of two calls at the same
  // time, only one gets true. The other answers like a token already used.
  async markUsed(id: string): Promise<void> {
    const { data, error, status } = await this.database.rpc('use_password_reset_token', { p_id: id })
    if (error) throw databaseError('use reset token', error, status)
    if (data !== true) throw new ApplicationError('INVALID_RESET_TOKEN', 'Invalid password reset token')
  }

  async invalidateAllOfUser(userId: string): Promise<void> {
    const { error, status } = await this.database
      .from(TABLE)
      .update({ used_at: new Date().toISOString() })
      .eq('user_id', userId)
      .is('used_at', null)
    if (error) throw databaseError('invalidate reset tokens', error, status)
  }
}
