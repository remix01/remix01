import { NextResponse } from 'next/server'

export function dashboardSuccess<T>(data: T, correlationId: string, status = 200) {
  return NextResponse.json({ success: true, data, error: null, correlationId }, { status })
}

export function dashboardError(message: string, correlationId: string, status = 500) {
  return NextResponse.json({ success: false, data: null, error: message, correlationId }, { status })
}
