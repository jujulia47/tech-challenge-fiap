// Runs once, when the server starts: a missing, example or short secret stops it here, before any
// request. Docker checks the same rule before starting: docs/fase4/security.md
export async function register() {
  // Node only, imported here: the Edge build drops it, and it has no process to stop anyway
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { exitUnlessSecrets } = await import('@bytebank/utils')
    exitUnlessSecrets(process.env, ['NEXTAUTH_SECRET'], process.env.NEXT_RUNTIME)
  }
}
