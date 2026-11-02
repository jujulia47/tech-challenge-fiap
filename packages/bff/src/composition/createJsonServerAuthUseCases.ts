import { AuthenticateUser, RegisterUser, RequestPasswordReset, ResetPassword } from '@bytebank/core'
import {
  CryptoIdGenerator,
  CryptoResetTokenGenerator,
  HttpPasswordResetTokenRepository,
  HttpUserRepository,
  InMemoryRateLimiter,
  ScryptPasswordHasher,
  SmtpEmailSender,
  StaticCommonPasswordList,
  type SmtpConfig,
} from '@bytebank/infrastructure'

import { LOGIN_BY_EMAIL, LOGIN_BY_IP, REGISTER_BY_IP } from './rateLimits'

export interface AuthUseCases {
  authenticateUser: AuthenticateUser
  registerUser: RegisterUser
  requestPasswordReset: RequestPasswordReset
  resetPassword: ResetPassword
}

export interface JsonServerAuthOptions {
  baseUrl: string
  // Functions, so that a login does not depend on what only a reset needs
  resetUrl: (token: string) => string
  smtp: () => SmtpConfig
}

export function createJsonServerAuthUseCases({ baseUrl, resetUrl, smtp }: JsonServerAuthOptions): AuthUseCases {
  const users = new HttpUserRepository(baseUrl)
  const hasher = new ScryptPasswordHasher()
  const commonPasswords = new StaticCommonPasswordList()
  const tokens = new HttpPasswordResetTokenRepository(baseUrl)
  const generator = new CryptoResetTokenGenerator()
  // Shared by the login and the reset, which frees the email it belongs to
  const loginByEmail = new InMemoryRateLimiter(LOGIN_BY_EMAIL)

  return {
    authenticateUser: new AuthenticateUser(users, hasher, {
      byEmail: loginByEmail,
      byIp: new InMemoryRateLimiter(LOGIN_BY_IP),
    }),
    registerUser: new RegisterUser(
      users,
      hasher,
      new CryptoIdGenerator(),
      new InMemoryRateLimiter(REGISTER_BY_IP),
      commonPasswords,
    ),
    requestPasswordReset: new RequestPasswordReset({
      users,
      tokens,
      generator,
      emails: new SmtpEmailSender(smtp),
      limiters: { byEmail: new InMemoryRateLimiter(LOGIN_BY_EMAIL), byIp: new InMemoryRateLimiter(LOGIN_BY_IP) },
      resetUrl,
    }),
    resetPassword: new ResetPassword({
      users,
      tokens,
      generator,
      hasher,
      commonPasswords,
      loginLimiterByEmail: loginByEmail,
    }),
  }
}
