import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  getPartner,
} from '@/app/admin/actions'
import { PartnerDetailClient } from './PartnerDetailClient'

interface PageProps {
  params: {
    id: string
  }
}

export default async function PartnerDetailPage({ params }: PageProps) {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const partner = await getPartner(params.id)
  if (!partner) redirect('/admin/partnerji')

  return <PartnerDetailClient partner={partner} partnerId={params.id} />
}


