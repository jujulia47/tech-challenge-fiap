import type { EmailMessage } from '../ports/EmailSender'

export function passwordResetEmail(to: string, link: string, validMinutes: number): EmailMessage {
  return {
    to,
    subject: 'Redefinição de senha do Bytebank',
    text: [
      'Recebemos um pedido para redefinir a senha da sua conta no Bytebank.',
      '',
      `Abra este link para criar uma nova senha. Ele vale por ${validMinutes} minutos e só pode ser usado uma vez:`,
      link,
      '',
      'Se não foi você, ignore este e-mail. Sua senha continua a mesma.',
    ].join('\n'),
    html: [
      '<p>Recebemos um pedido para redefinir a senha da sua conta no Bytebank.</p>',
      `<p><a href="${link}">Criar uma nova senha</a></p>`,
      `<p>O link vale por ${validMinutes} minutos e só pode ser usado uma vez.</p>`,
      '<p>Se não foi você, ignore este e-mail. Sua senha continua a mesma.</p>',
    ].join('\n'),
  }
}
