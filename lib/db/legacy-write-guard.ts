export const LEGACY_WRITE_FORBIDDEN_TABLES = [
  'obrtniki',
  'rezervacije',
  'user',
  'craftworker_profile',
  'job',
  'payment',
  'conversation',
  'message',
  'violation',
] as const

export type LegacyForbiddenTable = (typeof LEGACY_WRITE_FORBIDDEN_TABLES)[number]

export class LegacyWriteBlockedError extends Error {
  constructor(table: string, context?: string) {
    super(
      `Blocked legacy write to "${table}"${context ? ` in ${context}` : ''}. Use canonical DAL/service layer.`
    )
    this.name = 'LegacyWriteBlockedError'
  }
}

export function assertLegacyWriteAllowed(table: string, context?: string): void {
  if ((LEGACY_WRITE_FORBIDDEN_TABLES as readonly string[]).includes(table)) {
    throw new LegacyWriteBlockedError(table, context)
  }
}
