import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Plus } from 'lucide-react'
import React from 'react'
import { PortfolioSortableGrid } from '@/components/portfolio/portfolio-sortable-grid'
import { PortfolioItemForm } from '@/components/portfolio/portfolio-item-form'

export default async function PortfolioPage() {
  const supabase = await createClient()

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/partner-auth/login')
  }

  // Get obrtnik profile
  const { data: profile } = await supabase
    .from('obrtnik_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!profile) {
    redirect('/partner-auth/login')
  }

  // Fetch portfolio items
  const { data: portfolioItems } = await supabase
    .from('portfolio_items')
    .select('*')
    .eq('obrtnik_id', profile.id)
    .order('sort_order', { ascending: true })
    .order('is_featured', { ascending: false })

  // Count featured
  const featuredCount = portfolioItems?.filter(item => item.is_featured).length || 0

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
        <EmptyState />
      )}
    </div>
  )
}

function PortfolioAddButton({ obrtnikId, featuredCount }: { obrtnikId: string; featuredCount: number }) {
  const [isOpen, setIsOpen] = React.useState(false)
  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition"
      >
        <Plus className="w-5 h-5" />
        Dodaj projekt
      </button>
      {isOpen && (
        <PortfolioItemForm
          obrtnikId={obrtnikId}
          onClose={() => setIsOpen(false)}
          onSaved={() => {
            setIsOpen(false)
            // Refresh will happen via page revalidation
          }}
        />
      )}
    </>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="text-6xl mb-4">📸</div>
      <h2 className="text-xl font-semibold text-foreground mb-2">Dodajte vaš prvi projekt</h2>
      <p className="text-muted-foreground max-w-md">
        Projekti vam pomagajo pritegniti stranke. Prikazite svoje najboljše delo!
      </p>
    </div>
  )
}
