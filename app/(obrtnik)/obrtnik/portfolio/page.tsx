import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PortfolioSortableGrid } from '@/components/portfolio/portfolio-sortable-grid'
import { PortfolioAddButton } from '@/components/portfolio/PortfolioAddButton'
import type { Database } from '@/types/supabase'

type PortfolioItemRow = Database['public']['Tables']['portfolio_items']['Row']

export const metadata = { title: 'Portfelj | LiftGO' }

export default async function PortfolioPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/partner-auth/login')

  const { data: profile } = await supabase
    .from('obrtnik_profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile) redirect('/partner-auth/login')

  const { data: portfolioItems } = await supabase
    .from('portfolio_items')
    .select('*')
    .eq('obrtnik_id', profile.id)
    .order('sort_order', { ascending: true })
    .order('is_featured', { ascending: false })

  const featuredCount = portfolioItems?.filter((item: PortfolioItemRow) => item.is_featured).length || 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Portfelj</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {portfolioItems?.length || 0} projektov skupaj | {featuredCount} izpostavljenih (max 3)
          </p>
        </div>
        <PortfolioAddButton obrtnikId={profile.id} featuredCount={featuredCount} />
      </div>

      {portfolioItems && portfolioItems.length > 0 ? (
        <PortfolioSortableGrid items={portfolioItems} obrtnikId={profile.id} />
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="text-6xl mb-4">📸</div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Dodajte vaš prvi projekt</h2>
          <p className="text-muted-foreground max-w-md">
            Projekti vam pomagajo pritegniti stranke. Prikazite svoje najboljše delo!
          </p>
        </div>
      )}
    </div>
  )
}
