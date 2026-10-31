import { DomainError, type DomainErrorCode } from '../errors/DomainError'

// NIST SP 800-63B rev. 4 for a password used alone. No composition rules, on purpose.
export const PASSWORD_MIN_LENGTH = 15
export const PASSWORD_MAX_LENGTH = 128

const CONTEXT_WORDS = ['bytebank']
const MIN_PART_LENGTH = 3
// A whole password made of one repeated piece: "aaaa", "abcabc", "passwordpassword"
const REPEATED = /^(.+?)\1+$/u

export interface PasswordContext {
  name: string
  email: string
}

export type PasswordIssue = Extract<
  DomainErrorCode,
  'PASSWORD_TOO_SHORT' | 'PASSWORD_TOO_LONG' | 'PASSWORD_TOO_COMMON' | 'PASSWORD_HAS_PERSONAL_CONTEXT'
>

export function normalizePassword(password: string): string {
  return password.normalize('NFKC')
}

// Counted in characters, not UTF-16 units, so that an emoji counts as one
export function passwordLength(password: string): number {
  return [...normalizePassword(password)].length
}

function comparable(value: string): string {
  return value.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase()
}

// How a password is compared with the list: spaces and case do not make it less common
export function comparablePassword(password: string): string {
  return comparable(password).replace(/\s/gu, '')
}

function contextWords({ name, email }: PasswordContext): string[] {
  const [local = '', domain = ''] = comparable(email).split('@')
  const parts = [...comparable(name).split(/\s+/u), ...local.split(/[._+-]/), domain.split('.')[0]]
  return [...CONTEXT_WORDS, ...parts.filter(part => [...part].length >= MIN_PART_LENGTH)]
}

// Used by the screens too, without the list, which only exists on the server
export function findPasswordIssue(
  password: string,
  context: PasswordContext,
  isListed = false,
): PasswordIssue | null {
  const compact = comparablePassword(password)
  if (isListed || REPEATED.test(compact)) return 'PASSWORD_TOO_COMMON'
  if (contextWords(context).some(word => compact.includes(word))) return 'PASSWORD_HAS_PERSONAL_CONTEXT'

  const length = passwordLength(password)
  if (length < PASSWORD_MIN_LENGTH) return 'PASSWORD_TOO_SHORT'
  return length > PASSWORD_MAX_LENGTH ? 'PASSWORD_TOO_LONG' : null
}

export function assertPasswordAllowed(password: string, context: PasswordContext, isListed: boolean): void {
  const issue = findPasswordIssue(password, context, isListed)
  if (issue) throw new DomainError(issue, 'The password does not follow the policy')
}
