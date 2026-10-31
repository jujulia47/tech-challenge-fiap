import { ApplicationError, DomainError, type ApplicationErrorCode } from '@bytebank/core'
import { InfrastructureError } from '@bytebank/infrastructure'
import { z } from 'zod'
import { jsonResponse } from './responses'

interface ValidationIssue {
  field: string
  message: string
}

export class InvalidJsonError extends Error {
  constructor() {
    super('Request body is not valid JSON')
    this.name = 'InvalidJsonError'
  }
}

export class PayloadTooLargeError extends Error {
  constructor() {
    super('Request body is too large')
    this.name = 'PayloadTooLargeError'
  }
}

const APPLICATION_ERROR_STATUS: Record<ApplicationErrorCode, number> = {
  TRANSACTION_NOT_FOUND: 404,
  TRANSACTION_DATE_IN_FUTURE: 422,
}

function validationResponse(issues: ValidationIssue[]): Response {
  return jsonResponse({ error: 'VALIDATION_ERROR', issues }, 400)
}

// Field and message only: a Zod issue also carries details about what was received
function toValidationIssues(error: z.ZodError): ValidationIssue[] {
  return error.issues.map(issue => ({ field: issue.path.join('.') || 'body', message: issue.message }))
}

export function unauthenticatedResponse(): Response {
  return jsonResponse({ error: 'UNAUTHENTICATED' }, 401)
}

export function forbiddenOriginResponse(): Response {
  return jsonResponse({ error: 'FORBIDDEN_ORIGIN' }, 403)
}

export function toErrorResponse(error: unknown): Response {
  if (error instanceof z.ZodError) return validationResponse(toValidationIssues(error))
  if (error instanceof InvalidJsonError) return validationResponse([{ field: 'body', message: error.message }])
  if (error instanceof PayloadTooLargeError) return jsonResponse({ error: 'PAYLOAD_TOO_LARGE' }, 413)
  if (error instanceof DomainError) return jsonResponse({ error: error.code }, 422)
  if (error instanceof ApplicationError) {
    return jsonResponse({ error: error.code }, APPLICATION_ERROR_STATUS[error.code])
  }
  if (error instanceof InfrastructureError) return jsonResponse({ error: 'UPSTREAM_ERROR' }, 502)
  return jsonResponse({ error: 'INTERNAL_ERROR' }, 500)
}
