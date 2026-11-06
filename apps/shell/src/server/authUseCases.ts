import { createAuthUseCases, createDataAdapters, type AuthUseCases } from '@bytebank/bff'
import { requireEnv } from '@bytebank/bff/env'

// On globalThis: Next.js may load this module once per route, and the login
// and the password reset must share the same attempt counters
const shared = globalThis as typeof globalThis & { bytebankAuthUseCases?: AuthUseCases }

// Built on the first request: `next build` loads the routes, and it must not need these variables
export function getAuthUseCases(): AuthUseCases {
  shared.bytebankAuthUseCases ??= createAuthUseCases({
    // json-server or Supabase, by DATA_BACKEND
    adapters: createDataAdapters(),
    // The public address of the shell, never the Host of the request, which a client can forge
    // to poison the link
    resetUrl: token => `${requireEnv('SHELL_URL')}/redefinir-senha?token=${token}`,
    // No SMTP_HOST, no email: production has no email service, and Mailpit is local only
    smtp: process.env.SMTP_HOST
      ? () => ({
          host: requireEnv('SMTP_HOST'),
          port: Number(requireEnv('SMTP_PORT')),
          from: requireEnv('MAIL_FROM'),
          user: process.env.SMTP_USER || undefined,
          pass: process.env.SMTP_PASS || undefined,
        })
      : null,
    // console.warn on purpose: this only runs on the server, so this goes to the server log
    log: message => console.warn(message),
  })
  return shared.bytebankAuthUseCases
}
