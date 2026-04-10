import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPartner } from '@/app/admin/actions'
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

  const partner = await getPartner(params.id)
  if (!partner) redirect('/admin/partnerji')

  return <PartnerDetailClient partner={partner} partnerId={params.id} />
}
