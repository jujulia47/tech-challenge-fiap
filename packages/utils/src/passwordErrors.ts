import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '@bytebank/core'

const MESSAGES: Record<string, string> = {
  PASSWORD_TOO_SHORT: `Use pelo menos ${PASSWORD_MIN_LENGTH} caracteres`,
  PASSWORD_TOO_LONG: `Use no máximo ${PASSWORD_MAX_LENGTH} caracteres`,
  PASSWORD_TOO_COMMON: 'Senha muito comum',
  PASSWORD_HAS_PERSONAL_CONTEXT: 'Não use seu nome, seu e-mail ou "bytebank" na senha',
  PASSWORD_UNCHANGED: 'A nova senha precisa ser diferente da atual',
}

// What a screen shows for a refused new password. Null for a code that is not about it.
export function passwordErrorMessage(code: unknown): string | null {
  return typeof code === 'string' ? (MESSAGES[code] ?? null) : null
}
