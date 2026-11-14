import { describe, expect, it, vi } from 'vitest'
import { createEndSessionsHandler } from './createEndSessionsHandler'

const ORIGIN = 'http://bytebank.test'
const post = (headers: Record<string, string> = { origin: ORIGIN }) =>
  new Request(`${ORIGIN}/api/sessions/end`, { method: 'POST', headers })

function setup(userId: string | null = 'u1') {
  const endAll = vi.fn(async () => undefined)
  const getUserId = vi.fn(async () => userId)
  const logger = { error: vi.fn() }
  const handler = createEndSessionsHandler({ getUserId, endAll, allowedOrigins: [ORIGIN], logger })
  return { handler, endAll, getUserId, logger }
}

describe('createEndSessionsHandler', () => {
  it('ends every session of the user of the session, and answers 204', async () => {
    const { handler, endAll } = setup()

    const response = await handler(post())

    expect(response.status).toBe(204)
    expect(endAll).toHaveBeenCalledWith('u1')
  })

  it('refuses another origin before reading the session', async () => {
    const { handler, endAll, getUserId } = setup()

    const response = await handler(post({ origin: 'https://evil.example' }))

    expect(response.status).toBe(403)
    expect(getUserId).not.toHaveBeenCalled()
    expect(endAll).not.toHaveBeenCalled()
  })

  it('answers 401 with no session, and ends nothing', async () => {
    const { handler, endAll } = setup(null)

    expect((await handler(post())).status).toBe(401)
    expect(endAll).not.toHaveBeenCalled()
  })

  it('logs a failure of the store and answers it without details', async () => {
    const { handler, endAll, logger } = setup()
    endAll.mockRejectedValueOnce(new Error('database down'))

    const response = await handler(post())

    expect(response.status).toBe(500)
    expect(await response.text()).not.toContain('database down')
    expect(logger.error).toHaveBeenCalled()
  })
})
