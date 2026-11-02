import type { UserDTO } from '../../application/UserDTO'
import { DomainError } from '../errors/DomainError'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const USER_NAME_MAX_LENGTH = 100

// Trimmed, not empty, and at most 100 characters (an emoji counts as one)
function validName(name: string): string {
  const trimmed = name.trim()
  if (trimmed === '' || [...trimmed].length > USER_NAME_MAX_LENGTH) {
    throw new DomainError('USER_INVALID_NAME', `User name must have from 1 to ${USER_NAME_MAX_LENGTH} characters`)
  }
  return trimmed
}

export interface UserProps {
  id: string
  name: string
  email: string
  passwordHash: string
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export class User {
  private readonly props: Readonly<UserProps>

  private constructor(props: UserProps) {
    this.props = Object.freeze({ ...props })
    Object.freeze(this)
  }

  static create({ id, name, email, passwordHash }: UserProps): User {
    const normalizedEmail = normalizeEmail(email)
    if (id.trim() === '') throw new DomainError('USER_INVALID_ID', 'User id must not be empty')
    const validatedName = validName(name)
    if (!EMAIL.test(normalizedEmail)) throw new DomainError('USER_INVALID_EMAIL', 'User email is not valid')
    if (passwordHash === '') {
      throw new DomainError('USER_INVALID_PASSWORD_HASH', 'User password hash must not be empty')
    }
    return new User({ id, name: validatedName, email: normalizedEmail, passwordHash })
  }

  withName(name: string): User {
    return new User({ ...this.props, name: validName(name) })
  }

  get id(): string {
    return this.props.id
  }

  get name(): string {
    return this.props.name
  }

  get email(): string {
    return this.props.email
  }

  get passwordHash(): string {
    return this.props.passwordHash
  }

  // The only way out of the application: it has no hash
  toDTO(): UserDTO {
    return { id: this.props.id, name: this.props.name, email: this.props.email }
  }

  // For the adapter that stores the user. Never reaches a use case result.
  toRecord(): UserProps {
    return { ...this.props }
  }
}
