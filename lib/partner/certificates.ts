export const ALLOWED_CERTIFICATE_MIME_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
])

export const MAX_CERTIFICATE_SIZE_BYTES = 5 * 1024 * 1024

export function isValidCertificateFile(file: File): boolean {
  return ALLOWED_CERTIFICATE_MIME_TYPES.has(file.type) && file.size <= MAX_CERTIFICATE_SIZE_BYTES
}

