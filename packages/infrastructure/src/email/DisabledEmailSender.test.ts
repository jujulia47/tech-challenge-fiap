import type { EmailSender } from '@bytebank/core'
import { describe, expect, it, vi } from 'vitest'
import { DisabledEmailSender } from './DisabledEmailSender'

// Through the port, as the use case calls it
const disabled = (log: (line: string) => void): EmailSender => new DisabledEmailSender(log)
const message = { to: 'ana@bytebank.com', subject: 'Redefinição de senha', text: 'link secreto', html: '<p>link secreto</p>' }

describe('DisabledEmailSender', () => {
  it('sends nothing and does not fail, so the reset still answers the same', async () => {
    const log = vi.fn()

    await expect(disabled(log).send(message)).resolves.toBeUndefined()
  })

  it('logs once that a message was dropped, with no address and no content', async () => {
    const log = vi.fn()

    await disabled(log).send(message)

    expect(log).toHaveBeenCalledTimes(1)
    const [line] = log.mock.calls[0]
    expect(line).toContain('disabled')
    expect(line).not.toContain('ana@bytebank.com')
    expect(line).not.toContain('link secreto')
  })
})
