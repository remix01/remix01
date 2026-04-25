'use server'

import { redirect } from 'next/navigation'
import { getAdminPovprasevanjeDetail } from '@/app/admin/actions'
import { PovprasevanjeEditForm } from '@/components/admin/PovprasevanjeEditForm'

export default async function PovprasevanjeDetailPage({ params }: { params: { id: string } }) {
  const data = await getAdminPovprasevanjeDetail(params.id)
  if (!data) redirect('/admin/povprasevanja')

  return <PovprasevanjeEditForm data={data} />
}
