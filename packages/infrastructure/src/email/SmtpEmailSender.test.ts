import nodemailer from 'nodemailer'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SmtpEmailSender } from './SmtpEmailSender'

const message = { to: 'ana@bytebank.com', subject: 'Assunto', text: 'texto', html: '<p>texto</p>' }
const config = { host: 'mail.test', port: 1025, from: 'Bytebank <no-reply@bytebank.test>' }

function fakeTransport(sendMail = vi.fn().mockResolvedValue({})) {
  const createTransport = vi
    .spyOn(nodemailer, 'createTransport')
    .mockReturnValue({ sendMail } as unknown as ReturnType<typeof nodemailer.createTransport>)
  return { createTransport, sendMail }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('SmtpEmailSender', () => {
  it('sends the message from the configured address', async () => {
    const { sendMail } = fakeTransport()

    await new SmtpEmailSender(() => config).send(message)

    expect(sendMail).toHaveBeenCalledExactlyOnceWith({ ...message, from: config.from })
  })

  it('works without a user, as Mailpit does', async () => {
    const { createTransport } = fakeTransport()

    await new SmtpEmailSender(() => config).send(message)

    expect(createTransport).toHaveBeenCalledWith({ host: 'mail.test', port: 1025, secure: false, auth: undefined })
  })

  it('uses the credentials and TLS when configured', async () => {
    const { createTransport } = fakeTransport()

    await new SmtpEmailSender(() => ({ ...config, port: 465, user: 'u', pass: 'p' })).send(message)

    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({ secure: true, auth: { user: 'u', pass: 'p' } }),
    )
  })

  it('reads the configuration only when sending', () => {
    const readConfig = vi.fn(() => config)

    new SmtpEmailSender(readConfig)

    expect(readConfig).not.toHaveBeenCalled()
  })

  it('reports a failure without the address', async () => {
    fakeTransport(vi.fn().mockRejectedValue(new Error('550 ana@bytebank.com rejected')))

    const error = (await new SmtpEmailSender(() => config).send(message).catch((caught: unknown) => caught)) as Error

    expect(error).toMatchObject({ code: 'EMAIL_NOT_SENT', message: 'The email could not be sent' })
    expect(error.cause).toBeUndefined()
  })
})
