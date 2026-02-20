import { createClient } from '@/lib/supabase/server'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Card } from '@/components/ui/card'
import { ObrnikCard } from '@/components/liftgo/ObrnikCard'
import { Search } from 'lucide-react'

export default async function ObrtnikiPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const supabase = await createClient()
  const city = typeof searchParams.city === 'string' ? searchParams.city : undefined
  const availableOnly = searchParams.available === 'true'

  let query = supabase
    .from('profiles')
    .select(`
      *,
      obrtnik_profiles(*),
      obrtnik_categories(category_id, categories(name))
    `)
    .eq('role', 'obrtnik')
    .eq('obrtnik_profiles.is_verified', true)

  if (city) {
    query = query.ilike('location_city', `%${city}%`)
  }

  if (availableOnly) {
    query = query.eq('obrtnik_profiles.is_available', true)
  }

  const { data: obrtniki } = await query

  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .order('name')

  const obrtnikiWithCategories = (obrtniki || []).map(obr => {
    const categoryNames = obr.obrtnik_categories?.map((oc: any) => oc.categories?.name).filter(Boolean) || []
    return {
      ...obr,
      categories: categoryNames
    }
  })

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
          Najdi obrtnika
        </h1>
        <p className="mt-2 text-muted-foreground">
          Preverjeniprofesionalci po vsej Sloveniji
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
        <aside className="space-y-6">
          <Card className="p-4">
            <h3 className="font-semibold text-foreground mb-4">Filtri</h3>

            <form className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="city">Mesto</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="city"
                    name="city"
                    type="search"
                    placeholder="Ljubljana, Maribor..."
                    defaultValue={city}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium">Kategorije</h4>
                <div className="space-y-2">
                  {categories?.slice(0, 8).map((category) => (
                    <div key={category.id} className="flex items-center space-x-2">
                      <Checkbox id={`cat-${category.id}`} name="category" value={category.id} />
                      <Label htmlFor={`cat-${category.id}`} className="text-sm font-normal cursor-pointer">
                        {category.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox id="available" name="available" value="true" defaultChecked={availableOnly} />
                <Label htmlFor="available" className="text-sm font-normal cursor-pointer">
                  Samo dosegljivi
                </Label>
              </div>
            </form>
          </Card>
        </aside>

        <div>
          {obrtnikiWithCategories.length === 0 ? (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground">Ni najdenih obrtnikov za izbrane filtre.</p>
            </Card>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2">
              {obrtnikiWithCategories.map((obrtnik) => (
                <ObrnikCard
                  key={obrtnik.id}
                  profile={obrtnik}
                  categories={obrtnik.categories}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
