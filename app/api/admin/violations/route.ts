import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const querySchema = z.object({
  type: z.enum(['PHONE_DETECTED', 'EMAIL_DETECTED', 'BYPASS_ATTEMPT', 'SUSPICIOUS_PATTERN']).optional(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  reviewed: z.enum(['true', 'false']).optional(),
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('50'),
})

export async function GET(request: NextRequest) {
  try {
    // Check admin auth
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true }
    })

    if (!dbUser || dbUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Parse query params
    const searchParams = Object.fromEntries(request.nextUrl.searchParams)
    const params = querySchema.parse(searchParams)
    
    const page = parseInt(params.page)
    const limit = parseInt(params.limit)
    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {}
    if (params.type) where.type = params.type
    if (params.severity) where.severity = params.severity
    if (params.reviewed) where.isReviewed = params.reviewed === 'true'

    // Fetch violations with relations
    const [violations, total] = await Promise.all([
      prisma.violation.findMany({
        where,
        include: {
          job: {
            select: {
              id: true,
              title: true,
              category: true,
              status: true,
            }
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              craftworkerProfile: {
                select: {
                  bypassWarnings: true,
                  isSuspended: true,
                }
              }
            }
          },
          message: {
            select: {
              id: true,
              sentAt: true,
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limit,
      }),
      prisma.violation.count({ where })
    ])

    return NextResponse.json({
      violations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('[admin/violations] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
