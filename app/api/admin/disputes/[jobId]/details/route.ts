import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

interface RouteContext {
  params: Promise<{ jobId: string }>
}

export async function GET(request: NextRequest, context: RouteContext) {
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

    const { jobId } = await context.params

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        conversation: {
          include: {
            messages: {
              include: {
                sender: {
                  select: { name: true }
                }
              },
              orderBy: { sentAt: 'asc' }
            }
          }
        },
        violations: {
          orderBy: { createdAt: 'desc' }
        },
        payment: true,
      }
    })

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    const messages = job.conversation?.messages.map(msg => ({
      id: msg.id,
      sender: msg.sender.name,
      body: msg.body,
      isBlocked: msg.isBlocked,
      sentAt: msg.sentAt.toISOString(),
    })) || []

    const violations = job.violations.map(v => ({
      id: v.id,
      type: v.type,
      severity: v.severity,
      detectedContent: v.detectedContent,
      createdAt: v.createdAt.toISOString(),
    }))

    return NextResponse.json({
      messages,
      violations,
      payment: job.payment ? {
        amount: Number(job.payment.amount),
        platformFee: Number(job.payment.platformFee),
        status: job.payment.status,
      } : null,
    })
  } catch (error) {
    console.error('[API] Failed to fetch dispute details:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
