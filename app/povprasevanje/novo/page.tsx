import { redirect } from 'next/navigation'

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function LegacyNovoPovprasevanjeRedirect(props: Props) {
  const searchParams = await props.searchParams
  const query = new URLSearchParams()

  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === 'string') {
      query.set(key, value)
    } else if (Array.isArray(value)) {
      for (const entry of value) {
        query.append(key, entry)
      }
    }
  }

  const suffix = query.toString()
  redirect(suffix ? `/novo-povprasevanje?${suffix}` : '/novo-povprasevanje')
}
