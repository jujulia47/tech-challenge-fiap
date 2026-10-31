import { ApplicationError, DomainError } from '@bytebank/core'
import { describe, expect, it, vi } from 'vitest'
import { createPasswordResetHandlers } from './createPasswordResetHandlers'

const ORIGIN = 'http://bff.test'
const TOKEN = 'a'.repeat(43)

function setup() {
  const requestPasswordReset = { execute: vi.fn().mockResolvedValue(undefined) }
  const resetPassword = { execute: vi.fn().mockResolvedValue(undefined) }
  const logger = { error: vi.fn() }
  const handlers = createPasswordResetHandlers({ requestPasswordReset, resetPassword, allowedOrigins: [ORIGIN], logger })
  return { requestPasswordReset, resetPassword, logger, handlers }
}

const post = (value: unknown, headers: Record<string, string> = { Origin: ORIGIN }) =>
  new Request('http://bff.test/api', { method: 'POST', headers, body: JSON.stringify(value) })

describe('createPasswordResetHandlers', () => {
  describe('request', () => {
    it('answers 202 and starts the use case with the IP', async () => {
      const { requestPasswordReset, handlers } = setup()

      const response = await handlers.request(post({ email: 'ana@bytebank.com' }, { Origin: ORIGIN, 'X-Forwarded-For': '10.0.0.1' }))

      expect(response.status).toBe(202)
      expect(await response.text()).toBe('{"status":"ACCEPTED"}')
      expect(requestPasswordReset.execute).toHaveBeenCalledWith({ email: 'ana@bytebank.com', ip: '10.0.0.1' })
    })

    it('answers before the email goes out, so the time tells nothing', async () => {
      const task = vi.fn()
      const { requestPasswordReset, resetPassword } = setup()
      const handlers = createPasswordResetHandlers({
        requestPasswordReset,
        resetPassword,
        allowedOrigins: [ORIGIN],
        defer: task,
      })

      const response = await handlers.request(post({ email: 'ana@bytebank.com' }))

      expect(response.status).toBe(202)
      expect(requestPasswordReset.execute).not.toHaveBeenCalled()
      expect(task).toHaveBeenCalledOnce()
    })

    it('answers the same when the use case fails, and logs it', async () => {
      const { requestPasswordReset, logger, handlers } = setup()
      requestPasswordReset.execute.mockRejectedValue(new Error('smtp down'))

      const response = await handlers.request(post({ email: 'ana@bytebank.com' }))
      await vi.waitFor(() => expect(logger.error).toHaveBeenCalledOnce())

      expect(response.status).toBe(202)
    })

    it('answers 400 for an invalid email, without running', async () => {
      const { requestPasswordReset, handlers } = setup()

      const response = await handlers.request(post({ email: 'no-at-sign' }))

      expect(response.status).toBe(400)
      expect(requestPasswordReset.execute).not.toHaveBeenCalled()
    })

    it.each([
      ['a strange Origin', { Origin: 'https://evil.example' }],
      ['no Origin', {}],
    ])('answers 403 for %s', async (_, headers) => {
      const { requestPasswordReset, handlers } = setup()

      const response = await handlers.request(post({ email: 'ana@bytebank.com' }, headers))

      expect(response.status).toBe(403)
      expect(requestPasswordReset.execute).not.toHaveBeenCalled()
    })
  })

  describe('confirm', () => {
    const body = { token: TOKEN, password: 'correct horse battery staple' }

    it('answers 204', async () => {
      const { resetPassword, handlers } = setup()

      const response = await handlers.confirm(post(body))

      expect(response.status).toBe(204)
      expect(resetPassword.execute).toHaveBeenCalledWith(body)
    })

    it('answers 400 with the code for an invalid token', async () => {
      const { resetPassword, handlers } = setup()
      resetPassword.execute.mockRejectedValue(new ApplicationError('INVALID_RESET_TOKEN', 'internal'))

      const response = await handlers.confirm(post(body))

      expect(response.status).toBe(400)
      expect(await response.text()).toBe('{"error":"INVALID_RESET_TOKEN"}')
    })

    it('answers 422 with the code of the policy', async () => {
      const { resetPassword, handlers } = setup()
      resetPassword.execute.mockRejectedValue(new DomainError('PASSWORD_TOO_COMMON', 'internal'))

      const response = await handlers.confirm(post(body))

      expect(response.status).toBe(422)
      expect(await response.text()).toBe('{"error":"PASSWORD_TOO_COMMON"}')
    })

    it.each([
      ['a malformed token', { ...body, token: 'short' }],
      ['an extra field', { ...body, userId: '1' }],
    ])('answers 400 for %s', async (_, value) => {
      const { resetPassword, handlers } = setup()

      const response = await handlers.confirm(post(value))

      expect(response.status).toBe(400)
      expect(resetPassword.execute).not.toHaveBeenCalled()
    })

    it('answers 403 for a strange Origin', async () => {
      const { handlers } = setup()

      expect((await handlers.confirm(post(body, { Origin: 'https://evil.example' }))).status).toBe(403)
    })
  })
})
