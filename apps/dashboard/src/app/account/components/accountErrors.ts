// RTK Query rejects with the code of the bff; anything else is a failure with no code
export function errorCodeOf(error: unknown): string | null {
  const code = (error as { code?: unknown } | null)?.code
  return typeof code === 'string' ? code : null
}
