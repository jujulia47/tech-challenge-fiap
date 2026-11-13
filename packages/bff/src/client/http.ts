// Shared by the clients of the browser. No imports, so nothing from the server reaches the bundle.

export const JSON_HEADERS = { 'Content-Type': 'application/json' }
export const UNKNOWN_ERROR = 'UNKNOWN_ERROR'

// The code the bff answered with, as { error: CODE }, or UNKNOWN_ERROR when there is none
export async function errorCode(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string }
    return body.error ?? UNKNOWN_ERROR
  } catch {
    return UNKNOWN_ERROR
  }
}
