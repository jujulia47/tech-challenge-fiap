import { ChangePassword, UpdateUserProfile } from '@bytebank/core'
import { HttpUserRepository, InMemoryRateLimiter, ScryptPasswordHasher, StaticCommonPasswordList } from '@bytebank/infrastructure'
import { parseAllowedOrigins, requireEnv } from '../env'
import { createAccountHandlers, type AccountHandlers } from '../http/createAccountHandlers'
import { LOGIN_BY_EMAIL } from './rateLimits'

const logger = {
  // console.error on purpose: this only runs on the server, so this goes to the server log
  error: (error: unknown) => console.error(error),
}

// The account routes of a zone, built on the first request, like the transaction handlers.
// The limiter has the values of the login. It lives in this process, so its count is not
// shared with the login of the shell: docs/fase4/security.md.
export function createLazyAccountHandlers(getUserId: () => Promise<string | null>): () => AccountHandlers {
  let handlers: AccountHandlers | undefined

  return () => {
    if (!handlers) {
      const users = new HttpUserRepository(requireEnv('JSON_SERVER_URL'))
      handlers = createAccountHandlers({
        getUserId,
        updateUserProfile: new UpdateUserProfile(users),
        changePassword: new ChangePassword({
          users,
          hasher: new ScryptPasswordHasher(),
          commonPasswords: new StaticCommonPasswordList(),
          limiterByEmail: new InMemoryRateLimiter(LOGIN_BY_EMAIL),
        }),
        allowedOrigins: parseAllowedOrigins(requireEnv('ALLOWED_ORIGINS')),
        logger,
      })
    }
    return handlers
  }
}
