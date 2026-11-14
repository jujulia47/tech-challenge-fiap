import { User, type UserRepository } from '@bytebank/core'
import { InfrastructureError } from '../errors/InfrastructureError'
import { DEFAULT_TIMEOUT_MS, JSON_HEADERS, assertOk, readJson, send } from './http'
import { idOf } from './transactionRecordMapper'

interface HttpUserRepositoryOptions {
  timeoutMs?: number
}

// As stored: the moment the sessions ended is an ISO date and time, readable in db.json
interface UserRecord {
  id: string
  name: string
  email: string
  passwordHash: string
  sessionsValidAfter?: string
}

function isUserRecord(value: unknown): value is UserRecord {
  const record = value as Partial<Record<keyof UserRecord, unknown>> | null
  const fields = [record?.id, record?.name, record?.email, record?.passwordHash]
  const ended = record?.sessionsValidAfter
  return fields.every(field => typeof field === 'string') && (ended === undefined || typeof ended === 'string')
}

function instantOf(iso: string | undefined): number | undefined {
  if (iso === undefined) return undefined
  const instant = Date.parse(iso)
  if (Number.isNaN(instant)) throw new InfrastructureError('Stored sessionsValidAfter is not a date')
  return instant
}

function userFromRecord(value: unknown): User {
  try {
    if (!isUserRecord(value)) throw new InfrastructureError('Stored user does not match the expected format')
    const { sessionsValidAfter, ...props } = value
    return User.create({ ...props, sessionsValidAfter: instantOf(sessionsValidAfter) })
  } catch (error) {
    throw new InfrastructureError(`Stored user is invalid: ${idOf(value)}`, { code: 'CORRUPTED_RECORD', cause: error })
  }
}

function recordOf(user: User): UserRecord {
  const { sessionsValidAfter, ...props } = user.toRecord()
  return sessionsValidAfter === undefined ? props : { ...props, sessionsValidAfter: new Date(sessionsValidAfter).toISOString() }
}

export class HttpUserRepository implements UserRepository {
  private readonly collectionUrl: string
  private readonly timeoutMs: number

  constructor(baseUrl: string, { timeoutMs = DEFAULT_TIMEOUT_MS }: HttpUserRepositoryOptions = {}) {
    this.collectionUrl = `${baseUrl.replace(/\/+$/, '')}/users`
    this.timeoutMs = timeoutMs
  }

  async findByEmail(email: string): Promise<User | null> {
    const where = encodeURIComponent(JSON.stringify({ email: { eq: email } }))
    // The email is in the query: errors name the collection only, because they reach the log
    const safeUrl = this.collectionUrl
    const response = await send(`${safeUrl}?_where=${where}`, this.timeoutMs, {}, safeUrl)
    assertOk(response, safeUrl)

    const records = await readJson(response, safeUrl)
    if (!Array.isArray(records)) {
      throw new InfrastructureError(`Expected a list of users: ${safeUrl}`, {
        code: 'UPSTREAM_INVALID_RESPONSE',
        url: safeUrl,
      })
    }
    // Matched here too: a login must not depend on the server's filter
    const record: unknown = records.find(item => (item as { email?: unknown } | null)?.email === email)
    return record === undefined ? null : userFromRecord(record)
  }

  async findById(id: string): Promise<User | null> {
    const url = `${this.collectionUrl}/${encodeURIComponent(id)}`
    const response = await send(url, this.timeoutMs)
    if (response.status === 404) return null
    assertOk(response, url)
    return userFromRecord(await readJson(response, url))
  }

  async updatePasswordHash(id: string, passwordHash: string): Promise<void> {
    await this.patch(id, { passwordHash })
  }

  async updateName(id: string, name: string): Promise<void> {
    await this.patch(id, { name })
  }

  async updateSessionsValidAfter(id: string, instant: number): Promise<void> {
    await this.patch(id, { sessionsValidAfter: new Date(instant).toISOString() })
  }

  // One field at a time: a PATCH never carries the whole record, so it cannot undo another change
  private async patch(id: string, changes: Partial<UserRecord>): Promise<void> {
    const url = `${this.collectionUrl}/${encodeURIComponent(id)}`
    const response = await send(url, this.timeoutMs, {
      method: 'PATCH',
      headers: JSON_HEADERS,
      body: JSON.stringify(changes),
    })
    assertOk(response, url)
  }

  async create(user: User): Promise<User> {
    const response = await send(this.collectionUrl, this.timeoutMs, {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify(recordOf(user)),
    })
    assertOk(response, this.collectionUrl)
    // json-server replaces the id on POST, so the response is the source of truth
    return userFromRecord(await readJson(response, this.collectionUrl))
  }
}
