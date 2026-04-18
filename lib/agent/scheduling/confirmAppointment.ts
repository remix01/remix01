import { NextRequest, NextResponse } from 'next/server'
import { schedulingConfirmBodySchema } from '@/lib/api/schemas/v1'

export async function confirmSchedulingRequest(req: NextRequest) {
  const validation = schedulingConfirmBodySchema.safeParse(await req.json())

  if (!validation.success) {
    return NextResponse.json({ error: 'Manjkajo obvezni parametri.' }, { status: 400 })
  }

  const { ponudbaId, scheduledStart, scheduledEnd } = validation.data

  const calRes = await fetch('/api/calendar/appointment', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: req.headers.get('cookie') || '',
    },
    body: JSON.stringify({ ponudbaId, scheduledStart, scheduledEnd }),
  })

  const data = await calRes.json()
  return NextResponse.json(data, { status: calRes.status })
}
