import { isValidCertificateFile, MAX_CERTIFICATE_SIZE_BYTES } from '@/lib/partner/certificates'

describe('certificate validation', () => {
  test('rejects invalid file type', () => {
    const file = new File(['x'], 'malware.exe', { type: 'application/x-msdownload' })
    expect(isValidCertificateFile(file)).toBe(false)
  })

  test('rejects too-large file', () => {
    const file = new File([new Uint8Array(MAX_CERTIFICATE_SIZE_BYTES + 1)], 'cert.pdf', { type: 'application/pdf' })
    expect(isValidCertificateFile(file)).toBe(false)
  })
})
