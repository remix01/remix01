import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: user.email! },
      select: { role: true }
    })

    if (dbUser?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const disputes = await prisma.job.findMany({
      where: { status: 'DISPUTED' },
      include: {
        customer: {
          select: { name: true, email: true }
        },
        craftworker: {
          select: { name: true, email: true }
        },
        payment: true,
        violations: {
          select: { id: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    })

    const result = disputes.map(job => ({
      id: job.id,
      jobId: job.id,
      jobTitle: job.title,
      customer: job.customer,
      craftworker: job.craftworker || { name: 'N/A', email: '' },
      amount: Number(job.payment?.amount || 0),
      platformFee: Number(job.payment?.platformFee || 0),
      disputeReason: job.payment?.disputeReason,
      createdAt: job.createdAt.toISOString(),
      daysOpen: Math.floor((Date.now() - job.createdAt.getTime()) / (1000 * 60 * 60 * 24)),
      violationCount: job.violations.length,
    }))

    return NextResponse.json(result)
  } catch (error) {
    console.error('[API] Failed to fetch disputes:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
