import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

type LeadInput = { ime: string; mesto: string; kategorija: string; opis?: string }

type CliOptions = {
  input: string
  dryRun: boolean
  minCount: number
}

function parseArgs(argv: string[]): CliOptions {
  const args = argv.slice(2)
  const dryRun = args.includes('--dry-run')

  const minCountIndex = args.indexOf('--min-count')
  let minCount = 100
  if (minCountIndex >= 0) {
    const raw = args[minCountIndex + 1]
    const parsed = Number(raw)
    if (!Number.isInteger(parsed) || parsed < 1) {
      throw new Error('Invalid --min-count value. Use a positive integer.')
    }
    minCount = parsed
  }

  const input = args.find((a) => !a.startsWith('--') && a !== String(minCount))
  if (!input) {
    throw new Error('Usage: tsx scripts/import-leads.ts <file.csv|file.json|folder> [--dry-run] [--min-count N]')
  }

  return { input, dryRun, minCount }
}

function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]

    if (char === '"') {
      const nextChar = line[i + 1]
      if (inQuotes && nextChar === '"') {
        current += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
      continue
    }

    current += char
  }

  result.push(current.trim())
  return result
}

function parseInput(filePath: string): LeadInput[] {
  const raw = fs.readFileSync(filePath, 'utf8')

  if (filePath.endsWith('.json')) {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      throw new Error(`JSON file must contain an array: ${filePath}`)
    }
    return parsed
  }

  const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  if (lines.length < 2) return []

  const [header, ...rows] = lines
  const cols = parseCsvLine(header).map((c) => c.toLowerCase())

  return rows.map((row) => {
    const values = parseCsvLine(row)
    const get = (k: string) => values[cols.indexOf(k)] || ''
    return { ime: get('ime'), mesto: get('mesto'), kategorija: get('kategorija'), opis: get('opis') }
  })
}

function findInputFiles(targetPath: string): string[] {
  const resolved = path.resolve(targetPath)
  const stat = fs.statSync(resolved)

  if (stat.isFile()) return [resolved]

  const stack = [resolved]
  const files: string[] = []

  while (stack.length > 0) {
    const current = stack.pop()
    if (!current) continue

    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name)
      if (entry.isDirectory()) {
        stack.push(fullPath)
        continue
      }
      if (entry.isFile() && (entry.name.endsWith('.csv') || entry.name.endsWith('.json'))) {
        files.push(fullPath)
      }
    }
  }

  return files.sort()
}

function normalizeLead(lead: LeadInput): LeadInput | null {
  const ime = lead.ime?.trim()
  const mesto = lead.mesto?.trim()
  const kategorija = lead.kategorija?.trim()
  const opis = lead.opis?.trim()

  if (!ime || !mesto || !kategorija) return null
  return { ime, mesto, kategorija, opis }
}

async function run() {
  const { input, dryRun, minCount } = parseArgs(process.argv)
  const files = findInputFiles(input)

  if (files.length === 0) throw new Error('No .csv or .json files found.')

  const allLeads = files.flatMap((file) => parseInput(file))
  const normalized = allLeads.map(normalizeLead).filter((lead): lead is LeadInput => lead !== null)

  const uniqueLeads = Array.from(new Map(normalized.map((l) => [`${l.ime.toLowerCase()}|${l.mesto.toLowerCase()}|${l.kategorija.toLowerCase()}`, l])).values())

  if (uniqueLeads.length < minCount) {
    throw new Error(`Import requires at least ${minCount} valid companies. Found ${uniqueLeads.length}.`)
  }

  const profileRows = uniqueLeads.map((lead) => {
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
        location_city: lead.mesto,
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

  if (dryRun) {
    console.log(`Dry run complete. Parsed ${allLeads.length} rows from ${files.length} files, ${uniqueLeads.length} unique valid leads.`)
    return
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRole) throw new Error('Missing SUPABASE URL or SERVICE ROLE KEY')

  const supabase = createClient(supabaseUrl, serviceRole)

  const { error: profileError } = await supabase.from('profiles').insert(profileRows.map((r) => r.profile))
  if (profileError) throw profileError
  const { error: obrtnikError } = await supabase.from('obrtnik_profiles').insert(profileRows.map((r) => r.obrtnik))
  if (obrtnikError) throw obrtnikError

  console.log(`Imported ${uniqueLeads.length} lead profiles from ${files.length} files.`)
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
