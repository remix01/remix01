import { NextResponse } from 'next/server'

export const SECURITY_MESSAGES = {
  forbidden: 'Nimate dovoljenja za dostop do tega vira.',
  tooManyRequests: 'Preveč zahtevkov. Poskusite znova kasneje.',
  csrf: 'Varnostno preverjanje ni uspelo. Osvežite stran in poskusite znova.',
} as const

export function forbiddenResponse(status = 403) {
  return NextResponse.json({ error: SECURITY_MESSAGES.forbidden }, { status })
}

export function tooManyRequestsResponse() {
  return NextResponse.json({ error: SECURITY_MESSAGES.tooManyRequests }, { status: 429 })
}
