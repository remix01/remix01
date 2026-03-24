'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Search, MapPin, Star, Filter } from 'lucide-react'
import Link from 'next/link'

interface SearchFilters {
  query: string
  city: string
  category: string
  rating: number
  verified: boolean
}

export default function SearchPage() {
  const supabase = createClient()
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    city: '',
    category: '',
    rating: 0,
    verified: false,
  })
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [totalCount, setTotalCount] = useState(0)
  const [categories, setCategories] = useState<any[]>([])

  useEffect(() => {
    loadCategories()
    handleSearch()
  }, [])

  async function loadCategories() {
    try {
      const { data } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')

      setCategories(data || [])
    } catch (error) {
      console.error('[v0] Error loading categories:', error)
    }
  }

  async function handleSearch() {
    setLoading(true)
    try {
      let query = supabase
        .from('obrtnik_profiles')
        .select('*', { count: 'exact' })
        .eq('is_verified', true)

      if (filters.verified) {
        query = query.eq('is_verified', true)
      }

      if (filters.rating > 0) {
        query = query.gte('avg_rating', filters.rating)
      }

      if (filters.query) {
        query = query.ilike('business_name', `%${filters.query}%`)
      }

      if (filters.category) {
        // Filter by selected category - subquery join
        const { data: obrtnikIds } = await supabase
          .from('obrtnik_categories')
          .select('obrtnik_id')
          .eq('category_id', filters.category)

        if (obrtnikIds && obrtnikIds.length > 0) {
          const ids = obrtnikIds.map((o: { obrtnik_id: string }) => o.obrtnik_id)
          query = query.in('id', ids)
        } else {
          setResults([])
          setTotalCount(0)
          setLoading(false)
          return
        }
      }

      const { data, count } = await query.limit(50)

      setResults(data || [])
      setTotalCount(count || 0)
    } catch (error) {
      console.error('[v0] Search error:', error)
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-muted">
      {/* Header */}
      <div className="bg-background border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-foreground mb-4">Poiščite mojstre</h1>

          {/* Search Bar */}
          <div className="flex gap-2 flex-col sm:flex-row">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Iskanje po imenu ali vrsti dela..."
                className="pl-10"
                value={filters.query}
                onChange={(e) => setFilters({ ...filters, query: e.target.value })}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch} disabled={loading} className="min-h-[48px]">
              {loading ? 'Iskanje...' : 'Iskanje'}
            </Button>
          </div>

          {/* Filters */}
          <div className="flex gap-2 mt-4 flex-wrap">
            <Input
              placeholder="Mesto..."
              className="w-32"
              value={filters.city}
              onChange={(e) => setFilters({ ...filters, city: e.target.value })}
            />
            <select
              className="px-3 py-2 border rounded-lg bg-background text-foreground"
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
            >
              <option value="">Vse kategorije</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
            <select
              className="px-3 py-2 border rounded-lg bg-background text-foreground"
              value={filters.rating}
              onChange={(e) => setFilters({ ...filters, rating: Number(e.target.value) })}
            >
              <option value="0">Vse ocene</option>
              <option value="4">4+ zvezdic</option>
              <option value="4.5">4.5+ zvezdic</option>
              <option value="5">5 zvezdic</option>
            </select>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.verified}
                onChange={(e) => setFilters({ ...filters, verified: e.target.checked })}
              />
              <span className="text-sm text-foreground">Samo preverjeni</span>
            </label>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : results.length > 0 ? (
          <>
            <p className="text-muted-foreground mb-6">
              Našli smo {totalCount} mojstrov
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {results.map((craftsperson) => (
                <Link key={craftsperson.id} href={`/mojstri/${craftsperson.id}`}>
                  <Card className="p-6 hover:shadow-lg hover:scale-105 transition-all cursor-pointer h-full flex flex-col">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-lg text-foreground">
                          {craftsperson.business_name}
                        </h3>
                        {craftsperson.is_verified && (
                          <Badge className="mt-1 bg-green-100 text-green-700">✓ Preverjeno</Badge>
                        )}
                      </div>
                    </div>

                    {craftsperson.description && (
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        {craftsperson.tagline || craftsperson.description}
                      </p>
                    )}

                    {/* Rating - only show if there are reviews */}
                    {craftsperson.total_reviews && craftsperson.total_reviews > 0 ? (
                      <div className="flex items-center gap-2 mb-4">
                        <div className="flex gap-0.5">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${
                                i < Math.round(craftsperson.avg_rating)
                                  ? 'fill-amber-400 text-amber-400'
                                  : 'text-muted'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-sm font-semibold">{craftsperson.avg_rating?.toFixed(1) || '0.0'}</span>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground mb-4">Brez ocen</div>
                    )}

                    {/* Subscription tier */}
                    <div className="mt-auto flex items-center justify-between">
                      <Badge className={craftsperson.subscription_tier === 'pro' ? 'bg-amber-100 text-amber-700' : 'bg-muted'}>
                        {craftsperson.subscription_tier === 'pro' ? 'PRO' : 'START'}
                      </Badge>
                      <Button size="sm" variant="outline" className="min-h-[44px]">
                        Poglej profil
                      </Button>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">
              Ni zadetkov za vaš iskalni pogoj. Poskusite z drugo kategorijo.
            </p>
            <Button className="mt-6 min-h-[48px]" onClick={() => setFilters({ query: '', city: '', category: '', rating: 0, verified: false })}>
              Počisti filtre
            </Button>
          </div>
        )}
      </div>
    </main>
  )
}
