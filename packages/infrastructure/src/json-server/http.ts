import { InfrastructureError } from '../errors/InfrastructureError'

export const JSON_HEADERS = { 'Content-Type': 'application/json' }
export const DEFAULT_TIMEOUT_MS = 5_000

function isTimeout(error: unknown): boolean {
  return error instanceof Error && error.name === 'TimeoutError'
}

function timeoutError(url: string, cause: unknown): InfrastructureError {
  return new InfrastructureError(`The backend did not answer in time: ${url}`, {
    code: 'UPSTREAM_TIMEOUT',
    url,
    cause,
  })
}

// fetch rejects when no response arrives: backend down, DNS failure, connection reset, timeout.
// Errors reach the server log, so a query with personal data passes a safeUrl without it.
export async function send(
  url: string,
  timeoutMs: number,
  init: RequestInit = {},
  safeUrl = url,
): Promise<Response> {
  try {
    return await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) })
  } catch (error) {
    if (isTimeout(error)) throw timeoutError(safeUrl, error)
    throw new InfrastructureError(`Could not reach the backend: ${safeUrl}`, {
      code: 'UPSTREAM_UNREACHABLE',
      url: safeUrl,
      cause: error,
    })
  }
}

export function assertOk(response: Response, url: string): void {
  if (!response.ok) {
    throw new InfrastructureError(`Request failed with status ${response.status}: ${url}`, {
      code: 'UPSTREAM_BAD_STATUS',
      status: response.status,
      url,
    })
  }
}

export async function readJson(response: Response, url: string): Promise<unknown> {
  try {
    return await response.json()
  } catch (error) {
    // The signal of the request also covers the body, which may stop halfway
    if (isTimeout(error)) throw timeoutError(url, error)
    // No cause: the message of a JSON parse error quotes the start of the response body
    throw new InfrastructureError(`Expected a JSON response: ${url}`, { code: 'UPSTREAM_INVALID_RESPONSE', url })
  }
}
