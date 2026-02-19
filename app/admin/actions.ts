'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import type { Stranka, Partner, AdminStats, ChartData } from '@/types/admin'

export async function getAdminStats(): Promise<AdminStats> {
  const now = new Date()
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1)

  const [
    skupajStranke,
    skupajPartnerji,
    strankeLastMonth,
    strankeMonthBefore,
    partnerjiLastMonth,
    partnerjiMonthBefore,
    cakajoceVerifikacije,
  ] = await Promise.all([
    prisma.user.count({ where: { role: 'CUSTOMER' } }),
    prisma.craftworkerProfile.count(),
    prisma.user.count({
      where: { role: 'CUSTOMER', createdAt: { gte: lastMonth } },
    }),
    prisma.user.count({
      where: { role: 'CUSTOMER', createdAt: { gte: twoMonthsAgo, lt: lastMonth } },
    }),
    prisma.craftworkerProfile.count({ where: { createdAt: { gte: lastMonth } } }),
    prisma.craftworkerProfile.count({
      where: { createdAt: { gte: twoMonthsAgo, lt: lastMonth } },
    }),
    prisma.craftworkerProfile.count({ where: { isVerified: false } }),
  ])

  const rastStrank = strankeMonthBefore > 0 
    ? Math.round(((strankeLastMonth - strankeMonthBefore) / strankeMonthBefore) * 100)
    : 100

  const rastPartnerjev = partnerjiMonthBefore > 0
    ? Math.round(((partnerjiLastMonth - partnerjiMonthBefore) / partnerjiMonthBefore) * 100)
    : 100

  return {
    skupajStranke,
    skupajPartnerji,
    cakajoceVerifikacije,
    aktivniUporabniki: skupajStranke + skupajPartnerji,
    rastStrank,
    rastPartnerjev,
  }
}

export async function getStranke(
  filter?: string,
  sortBy: 'createdAt' | 'name' = 'createdAt',
  page = 1,
  pageSize = 10
) {
  const skip = (page - 1) * pageSize

  const where: any = { role: 'CUSTOMER' }
  if (filter) {
    where.OR = [
      { name: { contains: filter, mode: 'insensitive' } },
      { email: { contains: filter, mode: 'insensitive' } },
    ]
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: sortBy === 'createdAt' ? { createdAt: 'desc' } : { name: 'asc' },
      include: {
        _count: {
          select: { jobs: true },
        },
      },
    }),
    prisma.user.count({ where }),
  ])

  const stranke: Stranka[] = users.map((user) => ({
    id: user.id,
    ime: user.name.split(' ')[0] || '',
    priimek: user.name.split(' ').slice(1).join(' ') || '',
    email: user.email,
    telefon: user.phone || undefined,
    createdAt: user.createdAt,
    status: 'AKTIVEN' as const,
    narocil: user._count.jobs,
  }))

  return { stranke, total, pages: Math.ceil(total / pageSize) }
}

export async function getPartnerji(
  filter?: string,
  statusFilter?: string,
  sortBy: 'createdAt' | 'ocena' = 'createdAt',
  page = 1,
  pageSize = 10
) {
  const skip = (page - 1) * pageSize

  const where: any = {}
  if (filter) {
    where.user = {
      OR: [
        { name: { contains: filter, mode: 'insensitive' } },
        { email: { contains: filter, mode: 'insensitive' } },
      ],
    }
  }
  if (statusFilter === 'PENDING') {
    where.isVerified = false
  } else if (statusFilter === 'AKTIVEN') {
    where.isVerified = true
    where.isSuspended = false
  } else if (statusFilter === 'SUSPENDIRAN') {
    where.isSuspended = true
  }

  const [profiles, total] = await Promise.all([
    prisma.craftworkerProfile.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: sortBy === 'createdAt' ? { createdAt: 'desc' } : { avgRating: 'desc' },
      include: {
        user: true,
      },
    }),
    prisma.craftworkerProfile.count({ where }),
  ])

  const partnerji: Partner[] = profiles.map((profile) => ({
    id: profile.id,
    ime: profile.user.name,
    podjetje: undefined,
    tip: 'PREVOZNIK' as const,
    email: profile.user.email,
    telefon: profile.user.phone || undefined,
    createdAt: profile.createdAt,
    status: profile.isSuspended
      ? 'SUSPENDIRAN'
      : profile.isVerified
        ? 'AKTIVEN'
        : 'PENDING',
    ocena: parseFloat(profile.avgRating.toString()),
    steviloPrevozov: profile.totalJobsCompleted,
  }))

  return { partnerji, total, pages: Math.ceil(total / pageSize) }
}

export async function odobriPartnerja(id: string) {
  await prisma.craftworkerProfile.update({
    where: { id },
    data: {
      isVerified: true,
      verifiedAt: new Date(),
    },
  })
  revalidatePath('/admin/partnerji')
}

export async function zavrniPartnerja(id: string, razlog: string) {
  await prisma.craftworkerProfile.update({
    where: { id },
    data: {
      isSuspended: true,
      suspendedReason: razlog,
      suspendedAt: new Date(),
    },
  })
  revalidatePath('/admin/partnerji')
}

export async function suspendiranjPartnerja(id: string, razlog?: string) {
  await prisma.craftworkerProfile.update({
    where: { id },
    data: {
      isSuspended: true,
      suspendedReason: razlog,
      suspendedAt: new Date(),
    },
  })
  revalidatePath('/admin/partnerji')
}

export async function getChartData(): Promise<{ stranke: ChartData[]; partnerji: ChartData[] }> {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun', 'Jul', 'Avg', 'Sep', 'Okt', 'Nov', 'Dec']
  const now = new Date()
  const chartData: { stranke: ChartData[]; partnerji: ChartData[] } = {
    stranke: [],
    partnerji: [],
  }

  for (let i = 5; i >= 0; i--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const nextMonthDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)

    const [strankeCount, partnerjiCount] = await Promise.all([
      prisma.user.count({
        where: {
          role: 'CUSTOMER',
          createdAt: { gte: monthDate, lt: nextMonthDate },
        },
      }),
      prisma.craftworkerProfile.count({
        where: {
          createdAt: { gte: monthDate, lt: nextMonthDate },
        },
      }),
    ])

    chartData.stranke.push({
      mesec: months[monthDate.getMonth()],
      vrednost: strankeCount,
    })

    chartData.partnerji.push({
      mesec: months[monthDate.getMonth()],
      vrednost: partnerjiCount,
    })
  }

  return chartData
}
