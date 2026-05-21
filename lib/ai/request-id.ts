import { randomUUID } from 'crypto'

export function extractRequestId(headers?: Headers): string {
  if (headers) {
    const fromHeader =
      headers.get('x-request-id') ??
      headers.get('x-vercel-id')
    if (fromHeader) return fromHeader
  }
  return randomUUID()
}
