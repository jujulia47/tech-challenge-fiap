import { createJsonServerAuthUseCases, type AuthUseCases } from '@bytebank/bff'
import { requireEnv } from '@bytebank/bff/env'

// On globalThis: Next.js may load this module once per route, and the login
// and the password reset must share the same attempt counters
const shared = globalThis as typeof globalThis & { bytebankAuthUseCases?: AuthUseCases }

// Built on the first request: `next build` loads the routes, and it must not need these variables
export function getAuthUseCases(): AuthUseCases {
  shared.bytebankAuthUseCases ??= createJsonServerAuthUseCases({
    baseUrl: requireEnv('JSON_SERVER_URL'),
    // A fixed address, never the Host of the request, which a client can forge to poison the link
    resetUrl: token => `${requireEnv('NEXTAUTH_URL')}/redefinir-senha?token=${token}`,
    smtp: () => ({
      host: requireEnv('SMTP_HOST'),
      port: Number(requireEnv('SMTP_PORT')),
      from: requireEnv('MAIL_FROM'),
      user: process.env.SMTP_USER || undefined,
      pass: process.env.SMTP_PASS || undefined,
    }),
  })
  return shared.bytebankAuthUseCases
}
