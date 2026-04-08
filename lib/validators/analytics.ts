import { z } from 'zod'

// Zod schema for analytics summary API response
export const AnalyticsSummarySchema = z.object({
  today: z.object({
    events: z.number().int().min(0).default(0),
    activeUsers: z.number().int().min(0).default(0),
    inquiries: z.number().int().min(0).default(0),
    conversions: z.number().int().min(0).default(0),
  }),
  last7Days: z.array(
    z.object({
      date: z.string(),
      events: z.number().int().min(0),
      inquiries: z.number().int().min(0),
      conversions: z.number().int().min(0),
    })
  ).default([]),
  topCategories: z.array(
    z.object({
      category: z.string(),
      count: z.number().int().min(0),
    })
  ).default([]),
  funnel: z.object({
    inquiries: z.number().int().min(0).default(0),
    offers: z.number().int().min(0).default(0),
    accepted: z.number().int().min(0).default(0),
    paid: z.number().int().min(0).default(0),
  }).default({ inquiries: 0, offers: 0, accepted: 0, paid: 0 }),
})

export type AnalyticsSummary = z.infer<typeof AnalyticsSummarySchema>

// Safe parser that provides defaults for missing fields
export function parseAnalyticsSummary(data: unknown): AnalyticsSummary | null {
  try {
    return AnalyticsSummarySchema.parse(data)
  } catch (error) {
    console.error('[v0] Analytics summary validation error:', error)
    return null
  }
}
