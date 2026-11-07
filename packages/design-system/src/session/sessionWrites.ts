export interface SessionClient<S> {
  getSession: () => Promise<S | null>
  signOut: () => Promise<unknown>
}

export interface SessionWrites<S> {
  read: () => Promise<S | null>
  settle: () => Promise<void>
  signOut: () => Promise<void>
}

const SIGN_OUT_ATTEMPTS = 2

// Every read of the session writes its cookie again. A read that left before a write (a new
// name, a sign-out) and answers after it puts the old cookie back: docs/fase4/security.md,
// "The session race". So the reads made here are tracked, and a write waits for them first.
export function createSessionWrites<S>(client: SessionClient<S>): SessionWrites<S> {
  const pending = new Set<Promise<unknown>>()

  async function settle(): Promise<void> {
    await Promise.allSettled([...pending])
  }

  return {
    read() {
      const reading = client.getSession()
      pending.add(reading)
      const done = () => void pending.delete(reading)
      reading.then(done, done)
      return reading
    },
    settle,
    async signOut() {
      // Checked after: a read from somewhere else (another tab, the provider) can still land late
      for (let attempt = 0; attempt < SIGN_OUT_ATTEMPTS; attempt += 1) {
        await settle()
        await client.signOut()
        if (!(await client.getSession())) return
      }
    },
  }
}
