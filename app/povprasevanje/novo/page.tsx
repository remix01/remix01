import { redirect } from 'next/navigation'

interface Props {
  searchParams: Promise<Record<string, string>>
}

export default async function NewInquiryAliasPage({ searchParams }: Props) {
  const params = await searchParams
  const qs = new URLSearchParams(params).toString()
  redirect(`/novo-povprasevanje${qs ? `?${qs}` : ''}`)
}
