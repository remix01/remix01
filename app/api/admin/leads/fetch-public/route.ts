/**
 * Fetches leads from a publicly accessible URL (CSV or JSON) and imports them.
 *
 * Supported sources:
 * - CSV with columns: ime, mesto, kategorija, opis (optional)
 * - JSON array: [{ ime, mesto, kategorija, opis? }]
 * - Configured env sources: PUBLIC_LEADS_SOURCE_URLS (comma-separated)
 *
 * Called by:
 * - Admin UI (POST with { url })
 * - Cron job at /api/cron/leads-fetch-public (GET, uses env sources)
 */
import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { supabaseAdmin, verifyAdmin } from '@/lib/supabase-admin'

interface LeadRow {
  ime: string
  mesto: string
  kategorija: string
  opis?: string
}

function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let cur = ''
  let inQ = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++ }
      else inQ = !inQ
    } else if (ch === ',' && !inQ) {
      result.push(cur.trim()); cur = ''
    } else {
      cur += ch
    }
  }
  result.push(cur.trim())
  return result
}

function parseCsv(text: string): LeadRow[] {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) return []
  const [header, ...rows] = lines
  const cols = parseCsvLine(header).map(c => c.toLowerCase())
  const get = (vals: string[], key: string) => vals[cols.indexOf(key)] || ''
  return rows.map(row => {
    const v = parseCsvLine(row)
    return { ime: get(v, 'ime'), mesto: get(v, 'mesto'), kategorija: get(v, 'kategorija'), opis: get(v, 'opis') }
  })
}

function parseJson(text: string): LeadRow[] {
  try {
    const parsed = JSON.parse(text)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

async function fetchAndParse(url: string): Promise<LeadRow[]> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15_000)
  try {
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const text = await res.text()
    const isJson = url.endsWith('.json') || res.headers.get('content-type')?.includes('json')
    return isJson ? parseJson(text) : parseCsv(text)
  } finally {
    clearTimeout(timeout)
  }
}

async function importLeads(rows: LeadRow[]): Promise<{ imported: number; skipped: number; error?: string }> {
  const valid = rows
    .map(r => ({ ime: r.ime?.trim(), mesto: r.mesto?.trim(), kategorija: r.kategorija?.trim(), opis: r.opis?.trim() }))
    .filter(r => r.ime && r.mesto && r.kategorija)

  if (valid.length === 0) return { imported: 0, skipped: rows.length }

  // Deduplicate against existing records
  const businessNames = valid.map(r => r.ime.toLowerCase())
  const { data: existing } = await supabaseAdmin
    .from('obrtnik_profiles')
    .select('business_name')
    .in('business_name', valid.map(r => r.ime))

  const existingNames = new Set((existing || []).map((e: any) => e.business_name?.toLowerCase()))
  const newLeads = valid.filter(r => !existingNames.has(r.ime.toLowerCase()))

  if (newLeads.length === 0) return { imported: 0, skipped: valid.length }

  const profileRows = newLeads.map(r => {
    const id = randomUUID()
    return {
      profile: { id, role: 'obrtnik', full_name: r.ime, location_city: r.mesto },
      obrtnik: {
        id,
        business_name: r.ime,
        location_city: r.mesto,
        description: r.opis || `${r.kategorija} v mestu ${r.mesto}.`,
        profile_status: 'lead',
        is_claimed: false,
        is_verified: false,
        verification_status: 'pending',
        source: 'import',
        visibility: 'public_limited',
        avg_rating: 0,
        total_reviews: 0,
      },
    }
  })

  const { error: pErr } = await supabaseAdmin.from('profiles').insert(profileRows.map(r => r.profile))
  if (pErr) return { imported: 0, skipped: rows.length, error: pErr.message }

  const { error: oErr } = await supabaseAdmin.from('obrtnik_profiles').insert(profileRows.map(r => r.obrtnik))
  if (oErr) {
    await supabaseAdmin.from('profiles').delete().in('id', profileRows.map(r => r.profile.id))
    return { imported: 0, skipped: rows.length, error: oErr.message }
  }

  return { imported: newLeads.length, skipped: valid.length - newLeads.length }
}

// POST — admin manually triggers with { url } or { urls: string[] }
export async function POST(req: NextRequest) {
  const admin = await verifyAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const rawUrls: string[] = body.urls
    ? Array.isArray(body.urls) ? body.urls : [body.urls]
    : body.url ? [body.url] : []

  if (rawUrls.length === 0) {
    return NextResponse.json({ error: 'Provide { url } or { urls: [] }' }, { status: 400 })
  }

  const results: Record<string, { imported: number; skipped: number; error?: string }> = {}

  for (const url of rawUrls) {
    try {
      const rows = await fetchAndParse(url)
      results[url] = await importLeads(rows)
    } catch (err: any) {
      results[url] = { imported: 0, skipped: 0, error: err.message }
    }
  }

  const total = Object.values(results).reduce((a, r) => a + r.imported, 0)
  return NextResponse.json({ ok: true, total_imported: total, results })
}

function verifyCronSecret(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return process.env.NODE_ENV !== 'production'
  return req.headers.get('authorization') === `Bearer ${cronSecret}`
}

// GET — called by cron using PUBLIC_LEADS_SOURCE_URLS env var
export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sourcesEnv = process.env.PUBLIC_LEADS_SOURCE_URLS || ''
  const urls = sourcesEnv.split(',').map(s => s.trim()).filter(Boolean)

  if (urls.length === 0) {
    return NextResponse.json({ ok: true, message: 'No PUBLIC_LEADS_SOURCE_URLS configured', total_imported: 0 })
  }

  const results: Record<string, { imported: number; skipped: number; error?: string }> = {}

  for (const url of urls) {
    try {
      const rows = await fetchAndParse(url)
      results[url] = await importLeads(rows)
    } catch (err: any) {
      results[url] = { imported: 0, skipped: 0, error: err.message }
      console.error(`[leads/fetch-public] Error fetching ${url}:`, err.message)
    }
  }

  const total = Object.values(results).reduce((a, r) => a + r.imported, 0)
  console.log(`[leads/fetch-public] total_imported=${total}`)
  return NextResponse.json({ ok: true, total_imported: total, results })
}
