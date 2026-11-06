import { ApplicationError, User, type UserRepository } from '@bytebank/core'
import { InfrastructureError } from '../errors/InfrastructureError'
import { UNIQUE_VIOLATION, databaseError, type SupabaseDatabase } from './database'

const TABLE = 'users'
const COLUMNS = 'id, name, email, password_hash'

interface UserRow {
  id: string
  name: string
  email: string
  password_hash: string
}

function isUserRow(value: unknown): value is UserRow {
  const row = value as Partial<Record<keyof UserRow, unknown>> | null
  return [row?.id, row?.name, row?.email, row?.password_hash].every(field => typeof field === 'string')
}

function userFromRow(value: unknown): User {
  try {
    if (!isUserRow(value)) throw new InfrastructureError('Stored user does not match the expected format')
    return User.create({ id: value.id, name: value.name, email: value.email, passwordHash: value.password_hash })
  } catch (error) {
    // No id in the message: a user id is personal data in the log
    throw new InfrastructureError('Stored user is invalid', { code: 'CORRUPTED_RECORD', cause: error })
  }
}

export class SupabaseUserRepository implements UserRepository {
  constructor(private readonly database: SupabaseDatabase) {}

  async findByEmail(email: string): Promise<User | null> {
    const { data, error, status } = await this.database.from(TABLE).select(COLUMNS).eq('email', email).maybeSingle()
    if (error) throw databaseError('find user by email', error, status)
    return data === null ? null : userFromRow(data)
  }

  async findById(id: string): Promise<User | null> {
    const { data, error, status } = await this.database.from(TABLE).select(COLUMNS).eq('id', id).maybeSingle()
    if (error) throw databaseError('find user by id', error, status)
    return data === null ? null : userFromRow(data)
  }

  async updatePasswordHash(id: string, passwordHash: string): Promise<void> {
    await this.update(id, { password_hash: passwordHash }, 'update password')
  }

  async updateName(id: string, name: string): Promise<void> {
    await this.update(id, { name }, 'update name')
  }

  async create(user: User): Promise<User> {
    const { id, name, email, passwordHash } = user.toRecord()
    const { data, error, status } = await this.database
      .from(TABLE)
      .insert({ id, name, email, password_hash: passwordHash })
      .select(COLUMNS)
      .single()
    // The unique index decides when two registrations of one email arrive together:
    // the second gets the same error as a lookup that found it
    if (error?.code === UNIQUE_VIOLATION) throw new ApplicationError('EMAIL_ALREADY_REGISTERED', 'Email already registered')
    if (error) throw databaseError('create user', error, status)
    return userFromRow(data)
  }

  // One column at a time, so a change of the name cannot undo a change of the password
  private async update(id: string, changes: Partial<UserRow>, operation: string): Promise<void> {
    const { error, status } = await this.database.from(TABLE).update(changes).eq('id', id)
    if (error) throw databaseError(operation, error, status)
  }
}
