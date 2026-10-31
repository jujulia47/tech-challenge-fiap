import type { PasswordResetToken, PasswordResetTokenRepository } from '@bytebank/core'
import { InfrastructureError } from '../errors/InfrastructureError'
import { DEFAULT_TIMEOUT_MS, JSON_HEADERS, assertOk, readJson, send } from './http'

function isTokenRecord(value: unknown): value is PasswordResetToken {
  const record = value as Partial<Record<keyof PasswordResetToken, unknown>> | null
  return (
    typeof record?.id === 'string' &&
    typeof record.userId === 'string' &&
    typeof record.tokenHash === 'string' &&
    typeof record.expiresAt === 'number' &&
    typeof record.used === 'boolean'
  )
}

export class HttpPasswordResetTokenRepository implements PasswordResetTokenRepository {
  private readonly collectionUrl: string

  constructor(
    baseUrl: string,
    private readonly timeoutMs = DEFAULT_TIMEOUT_MS,
  ) {
    this.collectionUrl = `${baseUrl.replace(/\/+$/, '')}/passwordResetTokens`
  }

  async create(token: Omit<PasswordResetToken, 'id'>): Promise<void> {
    const response = await send(this.collectionUrl, this.timeoutMs, {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify(token),
    })
    assertOk(response, this.collectionUrl)
  }

  async findByHash(tokenHash: string): Promise<PasswordResetToken | null> {
    const records = await this.where({ tokenHash: { eq: tokenHash } })
    return records.find(record => record.tokenHash === tokenHash) ?? null
  }

  async markUsed(id: string): Promise<void> {
    const url = `${this.collectionUrl}/${encodeURIComponent(id)}`
    const response = await send(url, this.timeoutMs, {
      method: 'PATCH',
      headers: JSON_HEADERS,
      body: JSON.stringify({ used: true }),
    })
    assertOk(response, url)
  }

  async invalidateAllOfUser(userId: string): Promise<void> {
    const records = await this.where({ userId: { eq: userId } })
    const open = records.filter(record => record.userId === userId && !record.used)
    await Promise.all(open.map(record => this.markUsed(record.id)))
  }

  // Errors name the collection only: the query has values that must not reach the log
  private async where(filter: object): Promise<PasswordResetToken[]> {
    const query = encodeURIComponent(JSON.stringify(filter))
    const safeUrl = this.collectionUrl
    const response = await send(`${safeUrl}?_where=${query}`, this.timeoutMs, {}, safeUrl)
    assertOk(response, safeUrl)

    const records = await readJson(response, safeUrl)
    if (!Array.isArray(records) || !records.every(isTokenRecord)) {
      throw new InfrastructureError(`Expected a list of tokens: ${safeUrl}`, {
        code: 'UPSTREAM_INVALID_RESPONSE',
        url: safeUrl,
      })
    }
    return records
  }
}
