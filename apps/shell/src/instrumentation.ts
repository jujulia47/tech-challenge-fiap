import { exitUnlessSecrets } from '@bytebank/utils'

// Runs once, when the server starts: a missing, example or short secret stops it here, before any
// request. Docker checks the same rule before starting: docs/fase4/security.md
export function register() {
  exitUnlessSecrets(process.env, ['NEXTAUTH_SECRET'], process.env.NEXT_RUNTIME)
}
