import { TRANSACTION_TYPES } from '@bytebank/core'
import { z } from 'zod'
import { MAX_ATTACHMENT_BYTES } from './limits'

// Every message is fixed here: Zod's defaults would echo unknown keys back to the client
const BODY_ERROR = 'Must be a JSON object with known fields only'
const CHANGES_ERROR = 'At least one field is required'
const TYPE_ERROR = 'Must be a transaction type code'
const AMOUNT_ERROR = 'Must be a positive safe integer, in cents'
const DATE_ERROR = 'Must be a date in the YYYY-MM-DD format'
const ATTACHMENT_FORMAT_ERROR = 'Must be a base64 data URL of a PNG, JPEG, WebP or PDF file'
const ATTACHMENT_SIZE_ERROR = `Must be at most ${MAX_ATTACHMENT_BYTES / 1024} KB`
const ID_ERROR = 'Must be a transaction id'
const PERIOD_ERROR = 'Must be 3, 6 or all'

const ATTACHMENT_DATA_URL = /^data:(?:image\/(?:png|jpeg|webp)|application\/pdf);base64,([A-Za-z0-9+/]+={0,2})$/
// Matches every id in use: legacy ("11"), json-server ("8N9On-LoiYA") and UUIDs. It also
// keeps "." and "..", which encodeURIComponent leaves as they are, out of the backend URL.
const TRANSACTION_ID = /^[\w-]{1,64}$/

const PERIODS = { '3': 3, '6': 6, all: 'all' } as const

function base64Payload(dataUrl: string): string {
  return dataUrl.slice(dataUrl.indexOf(',') + 1)
}

function isAllowedDataUrl(value: string): boolean {
  return ATTACHMENT_DATA_URL.test(value) && base64Payload(value).length % 4 === 0
}

function decodedSize(dataUrl: string): number {
  const base64 = base64Payload(dataUrl)
  const padding = base64.length - base64.replace(/=+$/, '').length
  return (base64.length / 4) * 3 - padding
}

const type = z.enum(TRANSACTION_TYPES, { error: TYPE_ERROR })
const amountInCents = z.int({ error: AMOUNT_ERROR }).positive({ error: AMOUNT_ERROR })
// Format only: whether the date exists is a rule of the domain (CalendarDate)
const date = z.string({ error: DATE_ERROR }).regex(/^\d{4}-\d{2}-\d{2}$/, { error: DATE_ERROR })
const attachment = z
  .string({ error: ATTACHMENT_FORMAT_ERROR })
  .refine(isAllowedDataUrl, { error: ATTACHMENT_FORMAT_ERROR, abort: true })
  .refine(value => decodedSize(value) <= MAX_ATTACHMENT_BYTES, { error: ATTACHMENT_SIZE_ERROR })

export const createTransactionBodySchema = z.strictObject(
  { type, amountInCents, date, attachment: attachment.optional() },
  { error: BODY_ERROR },
)

export const updateTransactionBodySchema = z
  .strictObject(
    {
      type: type.optional(),
      amountInCents: amountInCents.optional(),
      date: date.optional(),
      attachment: attachment.nullable().optional(),
    },
    { error: BODY_ERROR },
  )
  .refine(changes => Object.keys(changes).length > 0, { error: CHANGES_ERROR })

export type UpdateTransactionBody = z.infer<typeof updateTransactionBodySchema>

export const transactionParamsSchema = z.object({
  id: z.string({ error: ID_ERROR }).regex(TRANSACTION_ID, { error: ID_ERROR }),
})

export const chartDataQuerySchema = z.object({
  period: z.enum(['3', '6', 'all'], { error: PERIOD_ERROR }).transform(period => PERIODS[period]),
  type: type.optional(),
})
