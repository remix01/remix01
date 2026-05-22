import { redirect } from 'next/navigation'

export default async function ObrtknikDashboardLegacyRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = new URLSearchParams()
  const resolvedSearchParams = await searchParams

  for (const [key, value] of Object.entries(resolvedSearchParams)) {
    if (value === undefined) continue
    if (Array.isArray(value)) {
      for (const entry of value) params.append(key, entry)
    } else {
      params.set(key, value)
    }
  }

  const query = params.toString()
  redirect(`/partner-dashboard${query ? `?${query}` : ''}`)
}
