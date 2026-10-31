// No imports on purpose: proxy.ts can use this file through @bytebank/bff/env without
// pulling the handlers into its bundle.

// Read on demand, never at import time: `next build` loads the routes without these variables
export function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

function isOrigin(value: string): boolean {
  try {
    return new URL(value).origin === value
  } catch {
    return false
  }
}

// An entry that is not an exact origin, such as one with a trailing slash, would never match
// the Origin header and would refuse every write without saying why
export function parseAllowedOrigins(value: string): string[] {
  const origins = value
    .split(',')
    .map(origin => origin.trim())
    .filter(origin => origin !== '')

  if (origins.length === 0) throw new Error('ALLOWED_ORIGINS has no origins')
  const invalid = origins.find(origin => !isOrigin(origin))
  if (invalid !== undefined) throw new Error(`ALLOWED_ORIGINS has an invalid origin: "${invalid}"`)
  return origins
}
