const MESSAGES: Record<string, string> = {
  PASSWORD_TOO_SHORT: 'Use pelo menos 15 caracteres',
  PASSWORD_TOO_LONG: 'Use no máximo 128 caracteres',
  PASSWORD_TOO_COMMON: 'Senha muito comum',
  PASSWORD_HAS_PERSONAL_CONTEXT: 'Não use seu nome, seu e-mail ou "bytebank" na senha',
  PASSWORD_UNCHANGED: 'A nova senha precisa ser diferente da atual',
}

// What a screen shows for a refused new password. Null for a code that is not about it.
export function passwordErrorMessage(code: unknown): string | null {
  return typeof code === 'string' ? (MESSAGES[code] ?? null) : null
}
