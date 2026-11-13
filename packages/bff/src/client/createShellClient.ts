import { JSON_HEADERS, errorCode } from './http'

// Runs in the browser, like createTransactionsClient: no imports from the server

export interface Registration {
  name: string
  email: string
  password: string
}

// The times of the inactivity logout, read at run time from the shell
export interface SessionPolicyDTO {
  idleTimeoutSeconds: number
  idleWarningSeconds: number
  updateAgeSeconds: number
}

export interface ShellClient {
  register(registration: Registration): Promise<void>
  requestPasswordReset(email: string): Promise<void>
  confirmPasswordReset(token: string, password: string): Promise<void>
  fetchSessionPolicy(): Promise<SessionPolicyDTO>
}

// An answer that was not ok: the code of the bff and the status, which the registration also reads.
// A request with no answer at all is not one of these: fetch rejects with its own error.
export class ShellApiError extends Error {
  readonly code: string
  readonly status: number

  constructor(code: string, status: number) {
    super(code)
    this.name = 'ShellApiError'
    this.code = code
    this.status = status
  }
}

// The routes of the shell, at the root of its origin. The zones are served from that origin too,
// so the inactivity guard of a zone reaches /api/session-policy with the same client.
export function createShellClient(): ShellClient {
  async function request(url: string, init?: RequestInit): Promise<Response> {
    const response = await fetch(url, init)
    if (!response.ok) throw new ShellApiError(await errorCode(response), response.status)
    return response
  }

  async function post(url: string, body: unknown): Promise<void> {
    await request(url, { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(body) })
  }

  return {
    register: registration => post('/api/register', registration),
    requestPasswordReset: email => post('/api/password-reset/request', { email }),
    confirmPasswordReset: (token, password) => post('/api/password-reset/confirm', { token, password }),
    fetchSessionPolicy: async () => (await request('/api/session-policy')).json(),
  }
}
