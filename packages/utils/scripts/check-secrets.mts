// Run by the secrets-check service of docker-compose.yml, with plain Node and no install:
//   node check-secrets.mts NEXTAUTH_SECRET ATTACHMENT_ENCRYPTION_KEY
// Node 22 runs the TypeScript of secrets.ts as it is. Prints the names of the bad secrets, never a value.
import { assertSecrets, type SecretName } from '../src/secrets.ts'

try {
  assertSecrets(process.env, process.argv.slice(2) as SecretName[])
  process.stdout.write('Secrets: ok\n')
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
  process.exitCode = 1
}
