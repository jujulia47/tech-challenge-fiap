import type { EmailSender } from '@bytebank/core'

// Production has no email service: with no SMTP_HOST, nothing is sent. The use case still runs
// and answers the same, so the screen gives the same generic message and tells no email apart.
// The log says that a message was dropped, never to whom or what it held.
export class DisabledEmailSender implements EmailSender {
  constructor(private readonly log: (message: string) => void) {}

  async send(): Promise<void> {
    this.log('Email sending is disabled (SMTP_HOST is not set): a message was not sent')
  }
}
