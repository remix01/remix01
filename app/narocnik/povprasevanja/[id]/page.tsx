import { redirect } from 'next/navigation'

interface Props {
  params: Promise<{ id: string }>
}

export default async function LegacyNarocnikPovprasevanjeDetailRedirect(props: Props) {
  const { id } = await props.params
  redirect(`/povprasevanja/${id}`)
}
