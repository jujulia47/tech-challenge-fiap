import { findPasswordIssue, passwordLength, type PasswordContext } from '@bytebank/core'

export type PasswordStrength = 'weak' | 'good' | 'strong'

const STRONG_LENGTH = 20
const EMPTY_CONTEXT: PasswordContext = { name: '', email: '' }

export const PASSWORD_STRENGTH_LABELS: Record<PasswordStrength, string> = {
  weak: 'Fraca',
  good: 'Boa',
  strong: 'Forte',
}

// Mirrors the domain. The list of common passwords only exists on the server,
// so a password it refused comes in as refusedAsCommon.
export function passwordStrength(
  password: string,
  context: PasswordContext = EMPTY_CONTEXT,
  refusedAsCommon = false,
): PasswordStrength | null {
  if (password === '') return null
  if (findPasswordIssue(password, context, refusedAsCommon)) return 'weak'
  return passwordLength(password) >= STRONG_LENGTH ? 'strong' : 'good'
}
