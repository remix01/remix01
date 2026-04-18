import { z } from 'zod'

export const notificationsListQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
})

export const deviceRegisterBodySchema = z.object({
  token: z.string().min(1, 'Token je obvezen'),
  platform: z.enum(['ios', 'android', 'web'], {
    errorMap: () => ({ message: 'Platforma mora biti ios, android ali web' }),
  }),
  appVersion: z.string().optional(),
  deviceName: z.string().optional(),
})

export const analyticsEventSchema = z.object({
  name: z.string(),
  properties: z.record(z.any()).optional(),
  sessionId: z.string(),
  timestamp: z.string().optional(),
})

export const analyticsTrackBodySchema = z.object({
  events: z.array(analyticsEventSchema).max(50, 'Maximum 50 events per batch'),
})

export const schedulingConfirmBodySchema = z.object({
  ponudbaId: z.string().min(1),
  scheduledStart: z.string().min(1),
  scheduledEnd: z.string().min(1),
})
