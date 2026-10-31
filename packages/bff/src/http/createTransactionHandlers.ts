import type { UpdateTransactionInput } from '@bytebank/core'
import type { UseCases } from '../composition/createUseCases'
import {
  InvalidJsonError,
  PayloadTooLargeError,
  forbiddenOriginResponse,
  toErrorResponse,
  unauthenticatedResponse,
} from './errors'
import { isAllowedOrigin } from './origin'
import { jsonResponse, noContentResponse } from './responses'
import {
  chartDataQuerySchema,
  createTransactionBodySchema,
  transactionParamsSchema,
  updateTransactionBodySchema,
  type UpdateTransactionBody,
} from './schemas'

// A body with the largest attachment (about 96 KB in base64) stays well below this
export const MAX_BODY_BYTES = 200 * 1024

export interface Logger {
  error(error: unknown): void
}

export interface TransactionHandlersOptions {
  getUserId: (request: Request) => Promise<string | null>
  useCases: UseCases
  allowedOrigins: readonly string[]
  logger?: Logger
}

export interface TransactionHandlers {
  listTransactions(request: Request): Promise<Response>
  createTransaction(request: Request): Promise<Response>
  updateTransaction(request: Request, id: string): Promise<Response>
  deleteTransaction(request: Request, id: string): Promise<Response>
  getBalance(request: Request): Promise<Response>
  getStatement(request: Request): Promise<Response>
  getChartData(request: Request): Promise<Response>
}

// Content-Length may be missing (chunked requests), so the bytes are counted as they arrive
async function readBody(body: ReadableStream<Uint8Array>): Promise<string> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let size = 0
  let text = ''
  for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) {
    size += chunk.value.byteLength
    if (size > MAX_BODY_BYTES) {
      await reader.cancel()
      throw new PayloadTooLargeError()
    }
    text += decoder.decode(chunk.value, { stream: true })
  }
  return text + decoder.decode()
}

async function readJson(request: Request): Promise<unknown> {
  if (Number(request.headers.get('Content-Length')) > MAX_BODY_BYTES) throw new PayloadTooLargeError()
  const text = request.body ? await readBody(request.body) : ''
  try {
    return JSON.parse(text)
  } catch {
    throw new InvalidJsonError()
  }
}

// The use case removes the attachment on an explicit undefined and keeps it on an absent key
function toChanges({ attachment, ...changes }: UpdateTransactionBody): UpdateTransactionInput['changes'] {
  return attachment === undefined ? changes : { ...changes, attachment: attachment ?? undefined }
}

export function createTransactionHandlers({
  getUserId,
  useCases,
  allowedOrigins,
  logger,
}: TransactionHandlersOptions): TransactionHandlers {
  // The session comes first: without it the request is not read and no use case runs
  async function withSession(
    request: Request,
    action: (userId: string) => Promise<Response>,
  ): Promise<Response> {
    try {
      const userId = await getUserId(request)
      if (!userId) return unauthenticatedResponse()
      return await action(userId)
    } catch (error) {
      logger?.error(error)
      return toErrorResponse(error)
    }
  }

  // Writes only. A forged cross-site request stops here, before the session is even read.
  async function withAllowedOrigin(
    request: Request,
    action: (userId: string) => Promise<Response>,
  ): Promise<Response> {
    if (!isAllowedOrigin(request, allowedOrigins)) return forbiddenOriginResponse()
    return withSession(request, action)
  }

  return {
    listTransactions: request =>
      withSession(request, async userId => jsonResponse(await useCases.listTransactions.execute(userId))),

    createTransaction: request =>
      withAllowedOrigin(request, async userId => {
        const body = createTransactionBodySchema.parse(await readJson(request))
        return jsonResponse(await useCases.createTransaction.execute({ ...body, userId }), 201)
      }),

    updateTransaction: (request, id) =>
      withAllowedOrigin(request, async userId => {
        const params = transactionParamsSchema.parse({ id })
        const body = updateTransactionBodySchema.parse(await readJson(request))
        const changes = toChanges(body)
        return jsonResponse(await useCases.updateTransaction.execute({ id: params.id, userId, changes }))
      }),

    deleteTransaction: (request, id) =>
      withAllowedOrigin(request, async userId => {
        const params = transactionParamsSchema.parse({ id })
        await useCases.deleteTransaction.execute({ id: params.id, userId })
        return noContentResponse()
      }),

    getBalance: request =>
      withSession(request, async userId => jsonResponse(await useCases.getBalance.execute(userId))),

    getStatement: request =>
      withSession(request, async userId => jsonResponse(await useCases.getStatement.execute(userId))),

    getChartData: request =>
      withSession(request, async userId => {
        const { searchParams } = new URL(request.url)
        const { period, type } = chartDataQuerySchema.parse({
          period: searchParams.get('period'),
          type: searchParams.get('type') ?? undefined,
        })
        return jsonResponse(await useCases.getChartData.execute({ userId, period, type }))
      }),
  }
}
