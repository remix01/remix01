'use client'

import { useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'

interface FilterOption {
  value: string
  label: string
  count: number
}

interface MobileInquiryFiltersProps {
  categories: FilterOption[]
  locations: FilterOption[]
  selectedCategory?: string
  selectedLocation?: string
  selectedUrgency?: string
  selectedBudget?: string
}

const urgencyOptions: Array<{ value: string; label: string }> = [
  { value: 'nujno', label: 'Nujno' },
  { value: 'ta_teden', label: 'Ta teden' },
  { value: 'novo', label: 'Novo' },
]

const budgetOptions: Array<{ value: string; label: string }> = [
  { value: 'do-500', label: 'Do 500 €' },
  { value: '500-1500', label: '500 € - 1.500 €' },
  { value: '1500-plus', label: '1.500 €+' },
]

export function MobileInquiryFilters({
  categories,
  locations,
  selectedCategory,
  selectedLocation,
  selectedUrgency,
  selectedBudget,
}: MobileInquiryFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [open, setOpen] = useState(false)
  const [draftCategory, setDraftCategory] = useState(selectedCategory ?? '')
  const [draftLocation, setDraftLocation] = useState(selectedLocation ?? '')
  const [draftUrgency, setDraftUrgency] = useState(selectedUrgency ?? '')
  const [draftBudget, setDraftBudget] = useState(selectedBudget ?? '')

  const hasActive = useMemo(() => {
    return Boolean(selectedCategory || selectedLocation || selectedUrgency || selectedBudget)
  }, [selectedBudget, selectedCategory, selectedLocation, selectedUrgency])

  const applyFilters = () => {
    const params = new URLSearchParams(searchParams.toString())

    if (draftCategory) params.set('category', draftCategory)
    else params.delete('category')

    if (draftLocation) params.set('location', draftLocation)
    else params.delete('location')

    if (draftUrgency) params.set('urgency', draftUrgency)
    else params.delete('urgency')

    if (draftBudget) params.set('budget', draftBudget)
    else params.delete('budget')

    const query = params.toString()
    router.push(query ? `${pathname}?${query}` : pathname)
    setOpen(false)
  }

  const resetFilters = () => {
    setDraftCategory('')
    setDraftLocation('')
    setDraftUrgency('')
    setDraftBudget('')

    const params = new URLSearchParams(searchParams.toString())
    params.delete('category')
    params.delete('location')
    params.delete('urgency')
    params.delete('budget')

    const query = params.toString()
    router.push(query ? `${pathname}?${query}` : pathname)
    setOpen(false)
  }

  const chipClass = (active: boolean) =>
    `rounded-full border px-3 py-2 text-sm transition-colors ${
      active
        ? 'border-primary bg-primary/10 text-primary'
        : 'border-border bg-background text-muted-foreground hover:bg-muted/60'
    }`

  return (
    <div className="mb-4 md:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" className="w-full min-h-[44px] justify-between">
            <span className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              Filtri
            </span>
            {hasActive && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">Aktivni</span>
            )}
          </Button>
        </SheetTrigger>

        <SheetContent side="bottom" className="max-h-[85vh] rounded-t-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Filtriraj povpraševanja</SheetTitle>
          </SheetHeader>

          <div className="space-y-6 py-4 pb-24">
            <section>
              <h3 className="mb-2 text-sm font-semibold">Kategorija</h3>
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <button
                    key={category.value}
                    type="button"
                    className={chipClass(draftCategory === category.value)}
                    onClick={() => setDraftCategory(draftCategory === category.value ? '' : category.value)}
                  >
                    {category.label} ({category.count})
                  </button>
                ))}
              </div>
            </section>

            <section>
              <h3 className="mb-2 text-sm font-semibold">Lokacija</h3>
              <div className="flex flex-wrap gap-2">
                {locations.map((location) => (
                  <button
                    key={location.value}
                    type="button"
                    className={chipClass(draftLocation === location.value)}
                    onClick={() => setDraftLocation(draftLocation === location.value ? '' : location.value)}
                  >
                    {location.label} ({location.count})
                  </button>
                ))}
              </div>
            </section>

            <section>
              <h3 className="mb-2 text-sm font-semibold">Nujnost</h3>
              <div className="flex flex-wrap gap-2">
                {urgencyOptions.map((urgency) => (
                  <button
                    key={urgency.value}
                    type="button"
                    className={chipClass(draftUrgency === urgency.value)}
                    onClick={() => setDraftUrgency(draftUrgency === urgency.value ? '' : urgency.value)}
                  >
                    {urgency.label}
                  </button>
                ))}
              </div>
            </section>

            <section>
              <h3 className="mb-2 text-sm font-semibold">Budget</h3>
              <div className="flex flex-wrap gap-2">
                {budgetOptions.map((budget) => (
                  <button
                    key={budget.value}
                    type="button"
                    className={chipClass(draftBudget === budget.value)}
                    onClick={() => setDraftBudget(draftBudget === budget.value ? '' : budget.value)}
                  >
                    {budget.label}
                  </button>
                ))}
              </div>
            </section>
          </div>

          <SheetFooter className="fixed inset-x-0 bottom-0 border-t bg-background p-4 sm:static sm:p-0">
            <div className="flex w-full gap-2">
              <Button variant="outline" className="flex-1 min-h-[44px]" onClick={resetFilters}>
                Reset
              </Button>
              <Button className="flex-1 min-h-[44px]" onClick={applyFilters}>
                Uporabi filtre
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}
