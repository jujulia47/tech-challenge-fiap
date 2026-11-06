import { AuthenticateUser, RegisterUser, RequestPasswordReset, ResetPassword } from '@bytebank/core'
import {
  CryptoIdGenerator,
  CryptoResetTokenGenerator,
  DisabledEmailSender,
  ScryptPasswordHasher,
  SmtpEmailSender,
  StaticCommonPasswordList,
  type SmtpConfig,
} from '@bytebank/infrastructure'
import { createJsonServerAdapters, type DataAdapters } from './dataAdapters'
import { LIMIT_NAMESPACES, LOGIN_BY_EMAIL, LOGIN_BY_IP, REGISTER_BY_IP } from './rateLimits'

export interface AuthUseCases {
  authenticateUser: AuthenticateUser
  registerUser: RegisterUser
  requestPasswordReset: RequestPasswordReset
  resetPassword: ResetPassword
}

export interface AuthUseCasesOptions {
  adapters: DataAdapters
  // Functions, so that a login does not depend on what only a reset needs
  resetUrl: (token: string) => string
  // null turns the sending off: production has no email service (docs/fase4/deploy.md)
  smtp: (() => SmtpConfig) | null
  // Where the disabled sender says that a message was dropped
  log?: (message: string) => void
}

export function createAuthUseCases({ adapters, resetUrl, smtp, log = () => undefined }: AuthUseCasesOptions): AuthUseCases {
  const { users, resetTokens: tokens } = adapters
  const hasher = new ScryptPasswordHasher()
  const commonPasswords = new StaticCommonPasswordList()
  const generator = new CryptoResetTokenGenerator()
  // Shared by the login and the reset, which frees the email it belongs to. In Postgres the
  // password change of the dashboard counts in this same namespace.
  const loginByEmail = adapters.rateLimiter(LIMIT_NAMESPACES.loginByEmail, LOGIN_BY_EMAIL)

  return {
    authenticateUser: new AuthenticateUser(users, hasher, {
      byEmail: loginByEmail,
      byIp: adapters.rateLimiter(LIMIT_NAMESPACES.loginByIp, LOGIN_BY_IP),
    }),
    registerUser: new RegisterUser(
      users,
      hasher,
      new CryptoIdGenerator(),
      adapters.rateLimiter(LIMIT_NAMESPACES.registerByIp, REGISTER_BY_IP),
      commonPasswords,
    ),
    requestPasswordReset: new RequestPasswordReset({
      users,
      tokens,
      generator,
      emails: smtp ? new SmtpEmailSender(smtp) : new DisabledEmailSender(log),
      limiters: {
        byEmail: adapters.rateLimiter(LIMIT_NAMESPACES.resetRequestByEmail, LOGIN_BY_EMAIL),
        byIp: adapters.rateLimiter(LIMIT_NAMESPACES.resetRequestByIp, LOGIN_BY_IP),
      },
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

export interface JsonServerAuthOptions {
  baseUrl: string
  resetUrl: (token: string) => string
  smtp: () => SmtpConfig
}

export function createJsonServerAuthUseCases({ baseUrl, resetUrl, smtp }: JsonServerAuthOptions): AuthUseCases {
  return createAuthUseCases({ adapters: createJsonServerAdapters(baseUrl), resetUrl, smtp })
}
