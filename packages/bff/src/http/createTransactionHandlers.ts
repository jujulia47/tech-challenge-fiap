import type { UpdateTransactionInput } from '@bytebank/core'
import type { UseCases } from '../composition/createUseCases'
import { forbiddenOriginResponse, toErrorResponse, unauthenticatedResponse } from './errors'
import { isAllowedOrigin } from './origin'
import { readJson } from './readJson'
import { jsonResponse, noContentResponse } from './responses'
import {
  chartDataQuerySchema,
  createTransactionBodySchema,
  transactionParamsSchema,
  updateTransactionBodySchema,
  type UpdateTransactionBody,
} from './schemas'

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
