/**
 * Lead Management API Tests
 *
 * Tests for:
 * - GET /api/admin/leads (list leads)
 * - POST /api/admin/leads (create lead)
 * - POST /api/admin/leads/approve (bulk approve)
 * - POST /api/admin/leads/auto-process (AI evaluation)
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import { supabaseAdmin } from '@/lib/supabase-admin'

describe('Lead Management API', () => {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  let testLeadIds: string[] = []

  // Helper to get admin token (requires ADMIN_TOKEN env var for testing)
  const getAdminHeaders = () => {
    const token = process.env.ADMIN_TOKEN
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    }
  }

  afterAll(async () => {
    // Cleanup: delete test leads
    if (testLeadIds.length > 0) {
      await supabaseAdmin.from('obrtnik_profiles').delete().in('id', testLeadIds)
      await supabaseAdmin.from('profiles').delete().in('id', testLeadIds)
    }
  })

  describe('POST /api/admin/leads - Create Lead', () => {
    it('should create a new lead manually', async () => {
      const response = await fetch(`${baseUrl}/api/admin/leads`, {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({
          business_name: 'Test Plumbing Co',
          location_city: 'Ljubljana',
          category_id: 'plumbing',
          description: 'Professional plumbing services',
        }),
      })

      expect(response.status).toBe(201)
      const data = await response.json()
      expect(data.ok).toBe(true)
      expect(data.status).toBe('lead')
      expect(data.id).toBeDefined()

      testLeadIds.push(data.id)
    })

    it('should reject missing required fields', async () => {
      const response = await fetch(`${baseUrl}/api/admin/leads`, {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({
          business_name: 'Test Co',
          // missing location_city
        }),
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBeDefined()
    })

    it('should reject unauthorized requests', async () => {
      const response = await fetch(`${baseUrl}/api/admin/leads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer invalid-token',
        },
        body: JSON.stringify({
          business_name: 'Test Co',
          location_city: 'Ljubljana',
        }),
      })

      expect(response.status).toBe(401)
    })
  })

  describe('GET /api/admin/leads - List Leads', () => {
    it('should list leads with status filter', async () => {
      const response = await fetch(`${baseUrl}/api/admin/leads?status=lead&limit=10`, {
        headers: getAdminHeaders(),
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.data).toBeDefined()
      expect(Array.isArray(data.data)).toBe(true)
      expect(data.count).toBeDefined()
      expect(data.status).toBe('lead')
    })

    it('should support pagination', async () => {
      const response = await fetch(
        `${baseUrl}/api/admin/leads?status=lead&limit=5&offset=0`,
        { headers: getAdminHeaders() }
      )

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.data.length).toBeLessThanOrEqual(5)
    })

    it('should reject unauthorized requests', async () => {
      const response = await fetch(`${baseUrl}/api/admin/leads?status=lead`, {
        headers: {
          Authorization: 'Bearer invalid-token',
        },
      })

      expect(response.status).toBe(401)
    })
  })

  describe('POST /api/admin/leads/approve - Bulk Approve', () => {
    it('should approve leads in bulk', async () => {
      // First create a test lead
      const createRes = await fetch(`${baseUrl}/api/admin/leads`, {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({
          business_name: 'Test Electric',
          location_city: 'Maribor',
          category_id: 'electrical',
        }),
      })

      const { id: leadId } = await createRes.json()
      testLeadIds.push(leadId)

      // Now approve it
      const response = await fetch(`${baseUrl}/api/admin/leads/approve`, {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({
          ids: [leadId],
          status: 'active',
        }),
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.ok).toBe(true)
      expect(data.updated).toBe(1)
      expect(data.status).toBe('active')

      // Verify the lead was updated
      const verifyRes = await fetch(
        `${baseUrl}/api/admin/leads?status=active&limit=100`,
        { headers: getAdminHeaders() }
      )
      const verifyData = await verifyRes.json()
      const updated = verifyData.data.find((l: any) => l.id === leadId)
      expect(updated?.profile_status).toBe('active')
    })

    it('should reject invalid status', async () => {
      const response = await fetch(`${baseUrl}/api/admin/leads/approve`, {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({
          ids: ['test-id'],
          status: 'invalid-status',
        }),
      })

      expect(response.status).toBe(400)
    })

    it('should require ids array', async () => {
      const response = await fetch(`${baseUrl}/api/admin/leads/approve`, {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({
          status: 'active',
        }),
      })

      expect(response.status).toBe(400)
    })
  })

  describe('POST /api/admin/leads/auto-process - AI Evaluation', () => {
    it('should process leads with AI evaluation', async () => {
      const response = await fetch(`${baseUrl}/api/admin/leads/auto-process`, {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({
          limit: 5,
        }),
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.ok).toBe(true)
      expect(data.processed).toBeDefined()
      expect(Array.isArray(data.approved)).toBe(true)
      expect(Array.isArray(data.rejected)).toBe(true)
    })

    it('should return empty if no leads to process', async () => {
      // This test depends on there being no leads with status='lead'
      // which is unlikely in a real database, but tests the edge case
      const response = await fetch(`${baseUrl}/api/admin/leads/auto-process`, {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({
          limit: 0,
        }),
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.ok).toBe(true)
    })
  })
})
