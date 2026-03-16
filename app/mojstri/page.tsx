import { supabaseAdmin } from '@/lib/supabase-admin'
import { MojsterCard } from '@/components/mojstri/MojsterCard'
import MojstriFilteri from './_components/MojstriFilteri'
import type { ObrtnikiPublic } from '@/lib/dal/obrtniki'

export const dynamic = 'force-dynamic'

export default async function MojstriPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  const params = await searchParams
  const q = params.q?.trim() || ''
  const city = params.city?.trim() || ''
  const categoryId = params.category || ''
  const minRating = params.rating ? Number(params.rating) : 0

  // Load categories for the filter dropdown
  const { data: categories } = await supabaseAdmin
    .from('categories')
    .select('id, name')
    .eq('is_active', true)
    .order('sort_order')

  // If category filter is active, get matching obrtnik IDs first
  let allowedIds: string[] | null = null
  if (categoryId) {
    const { data: links } = await supabaseAdmin
      .from('obrtnik_categories')
      .select('obrtnik_id')
      .eq('category_id', categoryId)
    allowedIds = (links || []).map((l: any) => l.obrtnik_id)
    // No matches — return empty immediately
    if (allowedIds.length === 0) {
      return (
        <CatalogShell
          categories={categories || []}
          params={params}
          obrtniki={[]}
          total={0}
        />
      )
    }
  }

  // Build main query
  let query = supabaseAdmin
    .from('obrtnik_profiles')
    .select(
      `id, business_name, description, is_verified, avg_rating,
       subscription_tier, stripe_customer_id, created_at,
       profiles!inner(id, email, phone, full_name, location_city, location_region)`,
      { count: 'exact' }
    )
    .eq('is_verified', true)

  if (q) {
    query = query.or(`business_name.ilike.%${q}%,description.ilike.%${q}%`)
  }

  if (minRating > 0) {
    query = query.gte('avg_rating', minRating)
  }

  if (allowedIds) {
    query = query.in('id', allowedIds)
  }

  // Sort: PRO first, then by rating
  query = query
    .order('subscription_tier', { ascending: true }) // 'pro' < 'start' alphabetically — we'll re-sort below
    .order('avg_rating', { ascending: false })
    .limit(60)

  const { data: rawData, count } = await query

  let obrtniki: ObrtnikiPublic[] = (rawData || []) as any

  // Filter by city in memory (profiles.location_city is nested)
  if (city) {
    const cityLower = city.toLowerCase()
    obrtniki = obrtniki.filter((o) =>
      (o.profiles as any).location_city?.toLowerCase().includes(cityLower)
    )
  }

  // PRO partners first
  obrtniki.sort((a, b) => {
    if (a.subscription_tier === 'pro' && b.subscription_tier !== 'pro') return -1
    if (b.subscription_tier === 'pro' && a.subscription_tier !== 'pro') return 1
    return b.avg_rating - a.avg_rating
  })

  return (
    <CatalogShell
      categories={categories || []}
      params={params}
      obrtniki={obrtniki}
      total={city ? obrtniki.length : (count || 0)}
    />
  )
}

function CatalogShell({
  categories,
  params,
  obrtniki,
  total,
}: {
  categories: Array<{ id: string; name: string }>
  params: Record<string, string>
  obrtniki: ObrtnikiPublic[]
  total: number
}) {
  return (
    <main className="min-h-screen bg-muted">
      <div className="bg-background border-b">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Katalog mojstrov</h1>
          <p className="text-muted-foreground mb-6">
            Preverite profile mojstrov in izberite pravega za vaše delo.
          </p>
          <MojstriFilteri categories={categories} current={params} />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {obrtniki.length > 0 ? (
          <>
            <p className="text-sm text-muted-foreground mb-6">
              {total} {total === 1 ? 'mojster' : total < 5 ? 'mojstri' : 'mojstrov'}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {obrtniki.map((obrtnik) => (
                <MojsterCard key={obrtnik.id} obrtnik={obrtnik} />
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-lg mb-4">
              Ni zadetkov za izbrane filtre.
            </p>
            <a
              href="/mojstri"
              className="text-primary underline underline-offset-4 text-sm"
            >
              Počisti filtre
            </a>
          </div>
        )}
      </div>
    </main>
  )
}
