// No imports on purpose: docker-compose.yml runs this file with plain Node before the apps start
// (scripts/check-secrets.mts), and instrumentation.ts of each app runs it when the server starts.

export type SecretName = 'NEXTAUTH_SECRET' | 'ATTACHMENT_ENCRYPTION_KEY'

type Env = Record<string, string | undefined>

// 32 random bytes: the key of AES-256 and the size the README asks for both secrets
export const SECRET_BYTES = 32
const PLACEHOLDERS = ['replace-me']

export function secretMessage(name: SecretName): string {
  // No colon followed by a space: in docker-compose.yml, YAML would read the message as a mapping
  return `Missing or invalid ${name}. Generate 32 random bytes in base64, as in step 3 of the README`
}

// A placeholder or a short value would sign the sessions, or encrypt the attachments, with
// something anyone can guess. Only base64 of 32 bytes or more is taken.
export function isUsableSecret(value: string | undefined): boolean {
  const trimmed = value?.trim() ?? ''
  if (trimmed === '' || PLACEHOLDERS.includes(trimmed)) return false
  try {
    return atob(trimmed).length >= SECRET_BYTES
  } catch {
    return false
  }
}

export function assertSecrets(env: Env, names: readonly SecretName[]): void {
  const invalid = names.filter(name => !isUsableSecret(env[name]))
  if (invalid.length > 0) throw new Error(invalid.map(secretMessage).join('\n'))
}

// For instrumentation.ts. Next only logs an error thrown by register(), and then answers 500 to
// every request, so on Node the server stops instead, with the message. Another runtime throws.
// The runtime comes apart, as process.env.NEXT_RUNTIME: Next only fills it in where it is written.
export function exitUnlessSecrets(env: Env, names: readonly SecretName[], runtime: string | undefined): void {
  try {
    assertSecrets(env, names)
  } catch (error) {
    if (runtime !== 'nodejs') throw error
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
    process.exit(1)
  }
}
