import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPovprasevanje } from '@/lib/dal/povprasevanja'
import { getPonudbeForPovprasevanje } from '@/lib/dal/ponudbe'
import { PovprasevanjeDetailClient } from './client'

interface Props {
  params: Promise<{ id: string }>
}

export default async function PovprasevanjeDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/prijava')
  }

  const povprasevanje = await getPovprasevanje(id)
  if (!povprasevanje) {
    notFound()
  }

  if (povprasevanje.narocnik_id !== user.id) {
    redirect('/povprasevanja')
  }

  const ponudbe = await getPonudbeForPovprasevanje(id)

  const createdDate = new Date(povprasevanje.created_at).toLocaleDateString('sl-SI', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const urgencyLabels: Record<string, string> = {
    normalno: 'Normalno',
    kmalu: 'Kmalu',
    nujno: 'Nujno',
  }

  const statusLabels: Record<string, string> = {
    odprto: 'Odprto',
    v_teku: 'V teku',
    zakljuceno: 'Zaključeno',
    preklicano: 'Preklicano',
  }

  const statusColors: Record<string, string> = {
    odprto: 'bg-primary/10 text-primary',
    v_teku: 'bg-amber-100 text-amber-700',
    zakljuceno: 'bg-muted text-muted-foreground',
    preklicano: 'bg-red-100 text-red-800',
  }

  const urgencyColors: Record<string, string> = {
    normalno: 'bg-muted text-muted-foreground',
    kmalu: 'bg-amber-100 text-amber-700',
    nujno: 'bg-red-100 text-red-800',
  }

  return (
    <PovprasevanjeDetailClient
      povprasevanje={povprasevanje}
      ponudbe={ponudbe}
      id={id}
      createdDate={createdDate}
      urgencyLabels={urgencyLabels}
      statusLabels={statusLabels}
      statusColors={statusColors}
      urgencyColors={urgencyColors}
    />
  )
}
