import { findPasswordIssue, passwordContextWords, type PasswordContext } from '@bytebank/core'
import { estimatePasswordBits } from './passwordEntropy'

export type PasswordStrength = 'weak' | 'fair' | 'good' | 'strong'

// The lowest estimate, in bits, of each level. A random password of 15 letters and digits from
// a password manager has about 89 bits, so it stays strong even with a run in it by chance
// (99.9% of them, measured). 8 random characters are fair. Why: docs/fase4/security.md.
export const STRENGTH_THRESHOLDS: Readonly<Record<Exclude<PasswordStrength, 'weak'>, number>> = {
  fair: 40,
  good: 60,
  strong: 70,
}

export const PASSWORD_STRENGTH_LABELS: Record<PasswordStrength, string> = {
  weak: 'Fraca',
  fair: 'Razoável',
  good: 'Boa',
  strong: 'Forte',
}

const EMPTY_CONTEXT: PasswordContext = { name: '', email: '' }

export function strengthOfBits(bits: number): PasswordStrength {
  if (bits >= STRENGTH_THRESHOLDS.strong) return 'strong'
  if (bits >= STRENGTH_THRESHOLDS.good) return 'good'
  return bits >= STRENGTH_THRESHOLDS.fair ? 'fair' : 'weak'
}

// A password the domain refuses is weak, whatever its estimate. The list of common passwords only
// exists on the server, so a password it refused comes in as refusedAsCommon.
export function passwordStrength(
  password: string,
  context: PasswordContext = EMPTY_CONTEXT,
  refusedAsCommon = false,
): PasswordStrength | null {
  if (password === '') return null
  if (findPasswordIssue(password, context, refusedAsCommon)) return 'weak'
  return strengthOfBits(estimatePasswordBits(password, passwordContextWords(context)))
}
