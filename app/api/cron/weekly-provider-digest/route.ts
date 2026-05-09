/**
 * Weekly Provider Digest Cron
 *
 * Sends each active obrtnik a weekly summary: new requests, pending jobs,
 * and earnings for the past 7 days.
 *
 * Schedule: every Monday at 08:00 UTC (vercel.json)
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { automationWeeklyProviderDigest } from '@/lib/email/liftgo-automations'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://liftgo.net'

function verifyCronSecret(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization') || ''
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.warn('[weekly-provider-digest] CRON_SECRET not configured — endpoint is public')
    return true
  }
  return authHeader === `Bearer ${cronSecret}`
}

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

    // Get all active (available) obrtniki
    const { data: obrtniki, error: obrtnikiError } = await supabaseAdmin
      .from('obrtnik_profiles')
      .select('id, business_name')
      .eq('is_available', true)

    if (obrtnikiError) {
      console.error('[weekly-provider-digest] DB error:', obrtnikiError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    if (!obrtniki || obrtniki.length === 0) {
      return NextResponse.json({ success: true, sent: 0 })
    }

    const obrtnikiIds = obrtniki.map((o) => o.id)

    // Fetch emails from profiles
    const { data: profilesData } = await supabaseAdmin
      .from('profiles')
      .select('id, email')
      .in('id', obrtnikiIds)

    const emailMap = new Map(profilesData?.map((p) => [p.id, p.email]) || [])

    // Count new tasks (open) that match any obrtnik category — simplified: total open tasks this week
    const { count: newRequestsCount } = await supabaseAdmin
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'open')
      .gte('created_at', weekAgo)

    // Count pending jobs per obrtnik (tasks assigned, in_progress)
    const { data: pendingJobsData } = await supabaseAdmin
      .from('tasks')
      .select('assigned_to')
      .in('status', ['in_progress', 'has_ponudbe'])
      .in('assigned_to', obrtnikiIds)

    const pendingCountMap = new Map<string, number>()
    for (const task of pendingJobsData || []) {
      if (task.assigned_to) {
        pendingCountMap.set(task.assigned_to, (pendingCountMap.get(task.assigned_to) || 0) + 1)
      }
    }

    // Earnings from escrow this week per obrtnik
    const { data: escrowData } = await supabaseAdmin
      .from('escrow_transactions')
      .select('obrtnik_id, amount_cents')
      .eq('status', 'released')
      .gte('updated_at', weekAgo)
      .in('obrtnik_id', obrtnikiIds)

    const earningsMap = new Map<string, number>()
    for (const row of escrowData || []) {
      if (row.obrtnik_id) {
        earningsMap.set(
          row.obrtnik_id,
          (earningsMap.get(row.obrtnik_id) || 0) + (row.amount_cents || 0)
        )
      }
    }

    // Build provider digest list — only include obrtniki with an email
    const providers = obrtniki
      .map((o) => {
        const email = emailMap.get(o.id)
        if (!email) return null
        return {
          email,
          name: o.business_name || 'Mojster',
          newRequests: newRequestsCount || 0,
          pendingJobs: pendingCountMap.get(o.id) || 0,
          totalEarnings: (earningsMap.get(o.id) || 0) / 100,
        }
      })
      .filter(Boolean) as Array<{
      email: string
      name: string
      newRequests: number
      pendingJobs: number
      totalEarnings: number
    }>

    if (providers.length === 0) {
      return NextResponse.json({ success: true, sent: 0 })
    }

    const result = await automationWeeklyProviderDigest(providers, APP_URL)

    console.log('[weekly-provider-digest] Sent:', providers.length, result)
    return NextResponse.json({ success: true, sent: providers.length })
  } catch (err) {
    console.error('[weekly-provider-digest] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
