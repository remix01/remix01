import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPartner } from '@/app/admin/actions'
import { PartnerDetailClient } from '@/components/admin/PartnerDetailClient'

interface PageProps {
  params: Promise<{
    id: string
  }>
}

export default async function PartnerDetailPage({ params }: PageProps) {
  const { id } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const partner = await getPartner(id)
  if (!partner) redirect('/admin/partnerji')

  return <PartnerDetailClient partner={partner} partnerId={id} />
}
