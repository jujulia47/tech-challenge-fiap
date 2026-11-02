import NextAuth, { CredentialsSignin } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { clientIp } from '@bytebank/bff'
import { ApplicationError, RateLimitedError } from '@bytebank/core'
import { baseAuthConfig } from '@bytebank/auth'
import { rateLimitCode } from '@bytebank/utils'
import { getAuthUseCases } from '@/server/authUseCases'

// Ceilings for the request: a huge password must not reach the hash, nor a huge email the limiter
const MAX_PASSWORD_LENGTH = 1024
const MAX_EMAIL_LENGTH = 254

// Auth.js puts this code in the answer: the only way to tell the screen how long to wait
class RateLimitedSignin extends CredentialsSignin {
  constructor(retryAfterMs: number) {
    super()
    this.code = rateLimitCode(retryAfterMs)
  }
}

export const { handlers, auth } = NextAuth({
  ...baseAuthConfig(process.env),
  providers: [
    Credentials({
      credentials: {
        email: { label: 'E-mail', type: 'email' },
        password: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials, request) {
        const email = credentials?.email
        const password = credentials?.password

        if (typeof email !== 'string' || typeof password !== 'string') return null
        if (password.length > MAX_PASSWORD_LENGTH || email.length > MAX_EMAIL_LENGTH) return null

        try {
          const ip = clientIp(request.headers)
          return await getAuthUseCases().authenticateUser.execute({ email, password, ip })
        } catch (error) {
          if (error instanceof RateLimitedError) throw new RateLimitedSignin(error.retryAfterMs)
          if (error instanceof ApplicationError && error.code === 'INVALID_CREDENTIALS') return null
          throw error
        }
      },
    }),
  ],
})
