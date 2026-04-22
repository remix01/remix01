import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPartner } from '@/app/admin/actions'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { PartnerDetailClient } from './partner-detail-client'

interface PageProps {
  params: {
    id: string
  }
}

export default async function PartnerDetailPage({ params }: PageProps) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [partner, { data: obrtnikRow }] = await Promise.all([
    getPartner(params.id),
    supabaseAdmin.from('obrtnik_profiles').select('subscription_tier').eq('id', params.id).single(),
  ])
  if (!partner) redirect('/admin/partnerji')

  return (
    <PartnerDetailClient
      partner={partner}
      partnerId={params.id}
      currentTier={obrtnikRow?.subscription_tier ?? 'start'}
    />
  )
}
