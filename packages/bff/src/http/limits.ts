// No imports on purpose: a client component can use this file through @bytebank/bff/limits
// without pulling server code into the browser bundle. The value comes from docs/adr/0009.
export const MAX_ATTACHMENT_BYTES = 70 * 1024
