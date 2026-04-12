import Link from 'next/link'
import { Building2, Wrench } from 'lucide-react'

const categories = [
  { label: 'Vodovodar', href: '/vodovodar/ljubljana' },
  { label: 'Električar', href: '/elektricar/ljubljana' },
  { label: 'Slikopleskar', href: '/slikopleskar/ljubljana' },
  { label: 'Keramičar', href: '/keramicar/ljubljana' },
  { label: 'Klima servis', href: '/klima-servis/ljubljana' },
  { label: 'Mizar', href: '/mizar/ljubljana' },
]

const cities = [
  { label: 'Ljubljana', href: '/vodovodar/ljubljana' },
  { label: 'Maribor', href: '/vodovodar/maribor' },
  { label: 'Celje', href: '/vodovodar/celje' },
  { label: 'Kranj', href: '/vodovodar/kranj' },
  { label: 'Koper', href: '/vodovodar/koper' },
  { label: 'Novo mesto', href: '/vodovodar/novo-mesto' },
]

export function CategoryCityGrid() {
  return (
    <section className="mx-auto grid max-w-7xl gap-6 px-4 py-16 lg:grid-cols-2 lg:px-8">
      <div className="rounded-2xl border bg-card p-6">
        <h3 className="flex items-center gap-2 text-lg font-semibold"><Wrench className="h-4 w-4" />Top kategorije</h3>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {categories.map((item) => (
            <Link key={item.href} href={item.href} className="min-h-11 rounded-lg border px-3 py-2 text-sm hover:bg-muted">
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-6">
        <h3 className="flex items-center gap-2 text-lg font-semibold"><Building2 className="h-4 w-4" />Najbolj iskana mesta</h3>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {cities.map((item) => (
            <Link key={item.href} href={item.href} className="min-h-11 rounded-lg border px-3 py-2 text-sm hover:bg-muted">
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
