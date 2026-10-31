import {
  assertPasswordAllowed,
  comparablePassword,
  normalizePassword,
  type PasswordContext,
} from '../../domain/user/passwordPolicy'
import type { CommonPasswordList } from '../ports/CommonPasswordList'
import type { PasswordHasher } from '../ports/PasswordHasher'

// The only way to a new password hash, so that registration and reset follow one policy
export async function hashNewPassword(
  password: string,
  context: PasswordContext,
  commonPasswords: CommonPasswordList,
  hasher: PasswordHasher,
): Promise<string> {
  assertPasswordAllowed(password, context, await commonPasswords.has(comparablePassword(password)))
  return hasher.hash(normalizePassword(password))
}
