const MESSAGES: Record<string, string> = {
  PASSWORD_TOO_SHORT: 'Use pelo menos 15 caracteres',
  PASSWORD_TOO_LONG: 'Use no máximo 128 caracteres',
  PASSWORD_TOO_COMMON: 'Senha muito comum',
  PASSWORD_HAS_PERSONAL_CONTEXT: 'Não use seu nome, seu e-mail ou "bytebank" na senha',
}

export function passwordErrorMessage(code: unknown): string | null {
  return typeof code === 'string' ? (MESSAGES[code] ?? null) : null
}
