import { describe, expect, it, vi } from 'vitest'
import { createSessionWrites } from './sessionWrites'

interface Session {
  name: string
}

// A browser cookie and a server that answers when told to, like a slow network
function fakeClient(initial: Session | null) {
  let cookie = initial
  let held = 0
  const log: string[] = []
  const answers: Array<() => void> = []
  const client = {
    // The read sends the cookie it has now, and writes it back when the answer arrives
    getSession: vi.fn(() => {
      const sent = cookie
      return new Promise<Session | null>(resolve => {
        const answer = () => {
          if (sent) cookie = sent
          log.push(`read answered with ${sent?.name ?? 'nothing'}`)
          resolve(sent)
        }
        if (answers.length < held) answers.push(answer)
        else answer()
      })
    }),
    signOut: vi.fn(async () => {
      cookie = null
      log.push('signed out')
    }),
  }
  return {
    client,
    log,
    cookie: () => cookie,
    hold: (count: number) => { held = count },
    answerAll: () => answers.splice(0).forEach(answer => answer()),
  }
}

describe('createSessionWrites', () => {
  it('waits for a read in flight before signing out, so the old cookie does not come back', async () => {
    const fake = fakeClient({ name: 'Júlia' })
    const writes = createSessionWrites(fake.client)
    fake.hold(1)
    void writes.read()
    fake.hold(0)

    const signingOut = writes.signOut()
    await Promise.resolve()
    expect(fake.client.signOut).not.toHaveBeenCalled()
    fake.answerAll()
    await signingOut

    expect(fake.log).toEqual(['read answered with Júlia', 'signed out', 'read answered with nothing'])
    expect(fake.cookie()).toBeNull()
  })

  it('signs out again when a read from elsewhere brought the session back', async () => {
    const fake = fakeClient({ name: 'Júlia' })
    const writes = createSessionWrites(fake.client)
    fake.client.signOut.mockImplementationOnce(async () => {
      // The sign-out lands, and a late answer puts the old cookie back at once
      fake.log.push('signed out, then the old cookie came back')
    })

    await writes.signOut()

    expect(fake.client.signOut).toHaveBeenCalledTimes(2)
    expect(fake.cookie()).toBeNull()
  })

  it('gives up after two attempts, without a loop', async () => {
    const fake = fakeClient({ name: 'Júlia' })
    const writes = createSessionWrites(fake.client)
    fake.client.signOut.mockImplementation(async () => undefined)

    await writes.signOut()

    expect(fake.client.signOut).toHaveBeenCalledTimes(2)
  })

  it('settles once every read answered, even a failed one', async () => {
    const writes = createSessionWrites({
      getSession: () => Promise.reject(new Error('offline')),
      signOut: async () => undefined,
    })
    await expect(writes.read()).rejects.toThrow('offline')
    await expect(writes.settle()).resolves.toBeUndefined()
  })

  it('has nothing to wait for when no read is in flight', async () => {
    const fake = fakeClient({ name: 'Júlia' })
    const writes = createSessionWrites(fake.client)
    await writes.read()
    await writes.settle()
    expect(fake.client.getSession).toHaveBeenCalledTimes(1)
  })
})
