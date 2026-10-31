import type { EmailMessage, EmailSender } from '@bytebank/core'
import nodemailer from 'nodemailer'
import { InfrastructureError } from '../errors/InfrastructureError'

export interface SmtpConfig {
  host: string
  port: number
  from: string
  user?: string
  pass?: string
}

const SMTPS_PORT = 465

// Read on the first email: the login uses the same use cases and must not depend on SMTP
export class SmtpEmailSender implements EmailSender {
  constructor(private readonly readConfig: () => SmtpConfig) {}

  async send({ to, subject, text, html }: EmailMessage): Promise<void> {
    const { host, port, from, user, pass } = this.readConfig()
    const transport = nodemailer.createTransport({
      host,
      port,
      secure: port === SMTPS_PORT,
      auth: user ? { user, pass } : undefined,
    })
    try {
      await transport.sendMail({ from, to, subject, text, html })
    } catch {
      // No cause: an SMTP error quotes the address, and this goes to the log
      throw new InfrastructureError('The email could not be sent', { code: 'EMAIL_NOT_SENT' })
    }
  }
}
