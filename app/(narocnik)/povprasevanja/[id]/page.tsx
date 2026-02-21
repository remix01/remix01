'use server'

import { notFound, redirect } from 'next/navigation'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getPovprasevanje } from '@/lib/dal/povprasevanja'
import { getPonudbeForPovprasevanje } from '@/lib/dal/ponudbe'
import PonudbeList from '@/components/narocnik/ponudbe-list'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface Props {
  params: Promise<{ id: string }>
}

export default async function PovprasevanjeDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createServerClient()
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/prijava')
  }

  // Fetch povprasevanje
  const povprasevanje = await getPovprasevanje(id)
  if (!povprasevanje) {
    notFound()
  }

  // Check authorization - only naročnik who created it can view
  if (povprasevanje.narocnik_id !== user.id) {
    redirect('/narocnik/povprasevanja')
  }

  // Fetch ponudbe
  const ponudbe = await getPonudbeForPovprasevanje(id)

  // Format dates
  const createdDate = new Date(povprasevanje.created_at).toLocaleDateString('sl-SI', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const urgencyLabels: Record<string, string> = {
    'normalno': 'Normalno',
    'kmalu': 'Kmalu',
    'nujno': 'Nujno',
  }

  const statusLabels: Record<string, string> = {
    'odprto': 'Odprto',
    'v_teku': 'V teku',
    'zakljuceno': 'Zaključeno',
    'preklicano': 'Preklicano',
  }

  const statusColors: Record<string, string> = {
    'odprto': 'bg-green-100 text-green-800',
    'v_teku': 'bg-blue-100 text-blue-800',
    'zakljuceno': 'bg-gray-100 text-gray-800',
    'preklicano': 'bg-red-100 text-red-800',
  }

  const urgencyColors: Record<string, string> = {
    'normalno': 'bg-blue-100 text-blue-800',
    'kmalu': 'bg-orange-100 text-orange-800',
    'nujno': 'bg-red-100 text-red-800',
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <div className="mx-auto max-w-2xl px-4 py-8">
        
        {/* Section 1: Request Header */}
        <Card className="mb-8 p-6">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Badge className={statusColors[povprasevanje.status]}>
              {statusLabels[povprasevanje.status]}
            </Badge>
            <Badge className={urgencyColors[povprasevanje.urgency]}>
              {urgencyLabels[povprasevanje.urgency]}
            </Badge>
          </div>

          <h1 className="mb-4 text-3xl font-bold text-gray-900">
            {povprasevanje.title}
          </h1>

          <div className="mb-6 flex flex-wrap gap-4 text-sm text-gray-600">
            <span>📍 {povprasevanje.location_city}</span>
            <span>📅 {createdDate}</span>
            {povprasevanje.category?.name && (
              <span>🔧 {povprasevanje.category.name}</span>
            )}
          </div>

          <div className="mb-6 text-gray-700">
            <p className="whitespace-pre-wrap">{povprasevanje.description}</p>
          </div>

          {povprasevanje.location_notes && (
            <div className="mb-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-900">
              <strong>Opombe o lokaciji:</strong> {povprasevanje.location_notes}
            </div>
          )}

          {povprasevanje.budget_min && povprasevanje.budget_max && (
            <div className="mb-2 text-sm text-gray-700">
              <strong>Proračun:</strong> {povprasevanje.budget_min} - {povprasevanje.budget_max} EUR
            </div>
          )}

          {povprasevanje.preferred_date_from && povprasevanje.preferred_date_to && (
            <div className="text-sm text-gray-700">
              <strong>Željeni termin:</strong> od {new Date(povprasevanje.preferred_date_from).toLocaleDateString('sl-SI')} do {new Date(povprasevanje.preferred_date_to).toLocaleDateString('sl-SI')}
            </div>
          )}
        </Card>

        {/* Section 2: Ponudbe */}
        <div className="mb-8">
          <h2 className="mb-4 text-2xl font-bold text-gray-900">
            Prejete ponudbe ({ponudbe.length})
          </h2>
          <PonudbeList 
            ponudbe={ponudbe} 
            povprasevanjeId={id}
            povprasevanjeStatus={povprasevanje.status}
          />
        </div>
      </div>
    </div>
  )
}
