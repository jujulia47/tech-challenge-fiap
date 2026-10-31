import { InvalidJsonError, PayloadTooLargeError } from './errors'

// A body with the largest attachment (about 96 KB in base64) stays well below this
export const MAX_BODY_BYTES = 200 * 1024

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

export async function readJson(request: Request): Promise<unknown> {
  if (Number(request.headers.get('Content-Length')) > MAX_BODY_BYTES) throw new PayloadTooLargeError()
  const text = request.body ? await readBody(request.body) : ''
  try {
    return JSON.parse(text)
  } catch {
    throw new InvalidJsonError()
  }
}
