import { describe, expect, it } from 'vitest'
import { zoneSessionProps } from './zoneSessionProps'

const session = { user: { id: '1', name: 'Joana Silva', email: 'joana@exemplo.com' }, expires: '2026-11-06T21:00:00.000Z' }

describe('zoneSessionProps', () => {
  it('starts the provider with the session of the server, so the page load reads nothing', () => {
    expect(zoneSessionProps('/dashboard/api/auth', session)).toEqual({
      basePath: '/dashboard/api/auth',
      session,
      refetchOnWindowFocus: false,
    })
  })

  it('passes a missing session as null, which the provider takes as known, not as still loading', () => {
    // undefined would make the provider read the session on load, the read this avoids
    expect(zoneSessionProps('/transactions/api/auth', null).session).toBeNull()
  })
})
