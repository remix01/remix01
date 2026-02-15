import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const querySchema = z.object({
  filter: z.enum(['all', 'active', 'suspended', 'unverified']).default('all'),
})

export async function GET(request: NextRequest) {
  try {
    // Verify admin
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

    // Parse query params
    const searchParams = request.nextUrl.searchParams
    const { filter } = querySchema.parse({
      filter: searchParams.get('filter') || 'all'
    })

    // Build where clause based on filter
    const where: any = {}
    
    if (filter === 'active') {
      where.isSuspended = false
      where.isVerified = true
    } else if (filter === 'suspended') {
      where.isSuspended = true
    } else if (filter === 'unverified') {
      where.isVerified = false
    }

    // Fetch craftworkers with related data
    const craftworkers = await prisma.craftworkerProfile.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        _count: {
          select: {
            user: {
              where: {
                violations: {
                  some: {}
                }
              }
            }
          }
        }
      },
      orderBy: [
        { isSuspended: 'desc' },
        { bypassWarnings: 'desc' },
        { totalJobsCompleted: 'desc' }
      ]
    })

    // Get violation counts for each craftworker
    const craftworkersWithViolations = await Promise.all(
      craftworkers.map(async (cw) => {
        const violationCount = await prisma.violation.count({
          where: { userId: cw.user.id }
        })

        return {
          id: cw.user.id,
          name: cw.user.name,
          email: cw.user.email,
          packageType: cw.packageType,
          stripeOnboardingComplete: cw.stripeOnboardingComplete,
          totalJobsCompleted: cw.totalJobsCompleted,
          avgRating: Number(cw.avgRating),
          bypassWarnings: cw.bypassWarnings,
          isSuspended: cw.isSuspended,
          isVerified: cw.isVerified,
          violationCount,
        }
      })
    )

    return NextResponse.json(craftworkersWithViolations)
  } catch (error) {
    console.error('[API] Failed to fetch craftworkers:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
