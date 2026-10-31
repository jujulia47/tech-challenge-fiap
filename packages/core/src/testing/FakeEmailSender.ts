import type { EmailMessage, EmailSender } from '../application/ports/EmailSender'

export class FakeEmailSender implements EmailSender {
  readonly sent: EmailMessage[] = []

  async send(message: EmailMessage): Promise<void> {
    this.sent.push(message)
  }
}
