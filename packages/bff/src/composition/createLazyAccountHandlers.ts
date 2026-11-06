import { ChangePassword, UpdateUserProfile } from '@bytebank/core'
import { ScryptPasswordHasher, StaticCommonPasswordList } from '@bytebank/infrastructure'
import { parseAllowedOrigins, requireEnv } from '../env'
import { createAccountHandlers, type AccountHandlers } from '../http/createAccountHandlers'
import { createDataAdapters } from './dataAdapters'
import { LIMIT_NAMESPACES, LOGIN_BY_EMAIL } from './rateLimits'

const logger = {
  // console.error on purpose: this only runs on the server, so this goes to the server log
  error: (error: unknown) => console.error(error),
}

// The account routes of a zone, built on the first request, like the transaction handlers.
// The limiter has the values and the namespace of the login: in memory it counts on its own;
// in Postgres it is the same count as the login of the shell. See docs/fase4/security.md.
export function createLazyAccountHandlers(getUserId: () => Promise<string | null>): () => AccountHandlers {
  let handlers: AccountHandlers | undefined

  return () => {
    if (!handlers) {
      const adapters = createDataAdapters()
      const { users } = adapters
      handlers = createAccountHandlers({
        getUserId,
        updateUserProfile: new UpdateUserProfile(users),
        changePassword: new ChangePassword({
          users,
          hasher: new ScryptPasswordHasher(),
          commonPasswords: new StaticCommonPasswordList(),
          limiterByEmail: adapters.rateLimiter(LIMIT_NAMESPACES.loginByEmail, LOGIN_BY_EMAIL),
        }),
        allowedOrigins: parseAllowedOrigins(requireEnv('ALLOWED_ORIGINS')),
        logger,
      })
    }
    return handlers
  }
}
