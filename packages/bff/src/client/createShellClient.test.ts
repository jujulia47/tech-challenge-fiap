import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ShellApiError, createShellClient } from './createShellClient'

const fetchMock = vi.fn<typeof fetch>()
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function sent(call = 0) {
  const [url, init] = fetchMock.mock.calls[call]
  return { url, method: init?.method, headers: init?.headers, body: init?.body ? JSON.parse(String(init.body)) : undefined }
}

async function refusal(promise: Promise<unknown>): Promise<ShellApiError> {
  const error = await promise.then(() => null, (caught: unknown) => caught)
  if (!(error instanceof ShellApiError)) throw new Error('expected a ShellApiError')
  return error
}

describe('createShellClient', () => {
  const client = createShellClient()

  it('registers with a POST to /api/register, with the data as JSON', async () => {
    fetchMock.mockResolvedValue(json({ status: 'ACCEPTED' }, 202))

    await client.register({ name: 'Joana', email: 'joana@exemplo.com', password: 'uma senha longa' })

    expect(sent()).toEqual({
      url: '/api/register',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { name: 'Joana', email: 'joana@exemplo.com', password: 'uma senha longa' },
    })
  })

  it('asks for a reset link with a POST of the email only', async () => {
    fetchMock.mockResolvedValue(json({ status: 'ACCEPTED' }, 202))

    await client.requestPasswordReset('joana@exemplo.com')

    expect(sent()).toMatchObject({ url: '/api/password-reset/request', method: 'POST', body: { email: 'joana@exemplo.com' } })
  })

  it('confirms the reset with the token and the new password', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }))

    await expect(client.confirmPasswordReset('token-do-link', 'uma senha nova')).resolves.toBeUndefined()
    expect(sent()).toMatchObject({ url: '/api/password-reset/confirm', method: 'POST', body: { token: 'token-do-link', password: 'uma senha nova' } })
  })

  it('reads the session policy with a GET', async () => {
    const policy = { idleTimeoutSeconds: 600, idleWarningSeconds: 60, updateAgeSeconds: 300 }
    fetchMock.mockResolvedValue(json(policy))

    await expect(client.fetchSessionPolicy()).resolves.toEqual(policy)
    expect(sent()).toMatchObject({ url: '/api/session-policy', method: undefined })
  })

  it.each([
    [422, 'PASSWORD_TOO_COMMON'],
    [400, 'VALIDATION_ERROR'],
    [429, 'RATE_LIMITED'],
    [400, 'INVALID_RESET_TOKEN'],
  ])('refuses a %s with the code of the bff and the status: %s', async (status, code) => {
    fetchMock.mockResolvedValue(json({ error: code }, status))

    const error = await refusal(client.register({ name: 'Joana', email: 'j@x.co', password: 'senha' }))

    expect([error.code, error.status, error.name]).toEqual([code, status, 'ShellApiError'])
  })

  it('gives UNKNOWN_ERROR when the body of the error cannot be read, like the client of the zones', async () => {
    fetchMock.mockResolvedValue(new Response('<html>erro</html>', { status: 502 }))

    const error = await refusal(client.requestPasswordReset('j@x.co'))

    expect([error.code, error.status]).toEqual(['UNKNOWN_ERROR', 502])
  })

  it('lets a request with no answer reject with the error of fetch', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))

    await expect(client.fetchSessionPolicy()).rejects.toBeInstanceOf(TypeError)
  })

  it('never redirects: the routes of the shell do not need a session', async () => {
    fetchMock.mockResolvedValue(json({ error: 'UNAUTHENTICATED' }, 401))

    expect((await refusal(client.confirmPasswordReset('t', 'p'))).status).toBe(401)
  })
})
