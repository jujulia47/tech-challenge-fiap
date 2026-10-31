const CACHE_HEADERS = { 'Cache-Control': 'no-store' }
const JSON_HEADERS = { ...CACHE_HEADERS, 'Content-Type': 'application/json' }

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS })
}

export function noContentResponse(): Response {
  return new Response(null, { status: 204, headers: CACHE_HEADERS })
}
