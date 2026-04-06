import { redirect } from 'next/navigation'

export default function LegacyPovprasevanjeDetailPage({ params }: { params: { id: string } }) {
  redirect(`/povprasevanja/${params.id}`)
}
