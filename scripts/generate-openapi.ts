import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  analyticsTrackBodySchema,
  deviceRegisterBodySchema,
  notificationsListQuerySchema,
  schedulingConfirmBodySchema,
} from '@/lib/api/schemas/v1'
import { zodToOpenApiSchema } from '@/lib/openapi/zodToOpenApi'

const document = {
  openapi: '3.1.0',
  info: {
    title: 'LiftGO API',
    version: '1.0.0',
    description: 'Generated from Zod schemas. Do not edit manually.',
  },
  paths: {
    '/api/v1/notifications': {
      get: {
        tags: ['Notifications'],
        summary: 'List notifications for current user',
        parameters: [
          {
            in: 'query',
            name: 'page',
            required: false,
            schema: zodToOpenApiSchema(notificationsListQuerySchema.shape.page),
          },
          {
            in: 'query',
            name: 'limit',
            required: false,
            schema: zodToOpenApiSchema(notificationsListQuerySchema.shape.limit),
          },
        ],
        responses: {
          200: { description: 'Notifications returned' },
          400: { description: 'Invalid query parameters' },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/api/v1/notifications/{id}/read': {
      patch: {
        tags: ['Notifications'],
        summary: 'Mark single notification as read',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Notification marked as read' },
          401: { description: 'Unauthorized' },
          404: { description: 'Notification not found' },
        },
      },
    },
    '/api/v1/notifications/read-all': {
      patch: {
        tags: ['Notifications'],
        summary: 'Mark all notifications as read',
        responses: {
          200: { description: 'All notifications marked as read' },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/api/v1/devices/register': {
      post: {
        tags: ['Devices'],
        summary: 'Register push device token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: zodToOpenApiSchema(deviceRegisterBodySchema),
            },
          },
        },
        responses: {
          200: { description: 'Device registered' },
          400: { description: 'Validation error' },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/api/v1/devices/{token}': {
      delete: {
        tags: ['Devices'],
        summary: 'Deactivate a device token',
        parameters: [{ name: 'token', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Device removed' },
          401: { description: 'Unauthorized' },
          403: { description: 'Forbidden' },
          404: { description: 'Device not found' },
        },
      },
    },
    '/api/v1/analytics/track': {
      post: {
        tags: ['Analytics'],
        summary: 'Track client analytics events',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: zodToOpenApiSchema(analyticsTrackBodySchema),
            },
          },
        },
        responses: {
          200: { description: 'Events tracked' },
          400: { description: 'Validation error' },
          500: { description: 'Server error' },
        },
      },
    },
    '/api/agent/scheduling/confirm': {
      post: {
        tags: ['Agent Scheduling'],
        summary: 'Confirm appointment scheduling slot',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: zodToOpenApiSchema(schedulingConfirmBodySchema),
            },
          },
        },
        responses: {
          200: { description: 'Appointment confirmed' },
          400: { description: 'Validation error' },
          401: { description: 'Unauthorized' },
        },
      },
    },
  },
}

const outputPath = resolve(process.cwd(), 'docs/openapi.json')
writeFileSync(outputPath, `${JSON.stringify(document, null, 2)}\n`, 'utf8')
console.log(`Generated OpenAPI spec at ${outputPath}`)
