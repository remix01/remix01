import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

type LeadInput = { ime: string; mesto: string; kategorija: string; opis?: string }

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRole) throw new Error('Missing SUPABASE URL or SERVICE ROLE KEY')

const supabase = createClient(supabaseUrl, serviceRole)

function parseInput(filePath: string): LeadInput[] {
  const raw = fs.readFileSync(filePath, 'utf8')
  if (filePath.endsWith('.json')) return JSON.parse(raw)
  const lines = raw.split(/\r?\n/).filter(Boolean)
  const [header, ...rows] = lines
  const cols = header.split(',').map((c) => c.trim().toLowerCase())
  return rows.map((row) => {
    const values = row.split(',').map((v) => v.trim())
    const get = (k: string) => values[cols.indexOf(k)] || ''
    return { ime: get('ime'), mesto: get('mesto'), kategorija: get('kategorija'), opis: get('opis') }
  })
}

async function run() {
  const inputPath = process.argv[2]
  if (!inputPath) throw new Error('Usage: tsx scripts/import-leads.ts <file.csv|file.json>')
  const resolved = path.resolve(inputPath)
  const leads = parseInput(resolved)
  if (leads.length < 100) throw new Error('Import requires at least 100 companies')

  const profileRows = leads.map((lead) => {
    const id = randomUUID()
    return {
      profile: {
        id,
        role: 'obrtnik',
        full_name: lead.ime,
        location_city: lead.mesto,
      },
      obrtnik: {
        id,
        business_name: lead.ime,
        description: lead.opis || `${lead.kategorija} v mestu ${lead.mesto}.`,
        is_verified: false,
        is_claimed: false,
        profile_status: 'lead',
        source: 'import',
        visibility: 'public_limited',
        avg_rating: 0,
        total_reviews: 0,
      }
    }
  })

  const { error: profileError } = await supabase.from('profiles').insert(profileRows.map((r) => r.profile))
  if (profileError) throw profileError
  const { error: obrtnikError } = await supabase.from('obrtnik_profiles').insert(profileRows.map((r) => r.obrtnik))
  if (obrtnikError) throw obrtnikError

  console.log(`Imported ${leads.length} lead profiles.`)
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
