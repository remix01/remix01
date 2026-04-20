import { env, hasGoogleMaps } from '@/lib/env'

export type GeocodeResult = {
  formattedAddress: string
  city: string | null
  region: string | null
  country: string | null
  lat: number | null
  lng: number | null
  placeId: string | null
}

function findAddressComponent(components: any[], type: string): string | null {
  const found = components.find((c) => Array.isArray(c?.types) && c.types.includes(type))
  return found?.long_name ?? null
}

export async function geocodeLocation(input: string): Promise<GeocodeResult | null> {
  const query = input.trim()
  if (!query || !hasGoogleMaps()) return null

  try {
    const url = new URL('https://maps.googleapis.com/maps/api/geocode/json')
    url.searchParams.set('address', query)
    url.searchParams.set('key', env.GOOGLE_MAPS_API_KEY)
    url.searchParams.set('region', 'si')
    url.searchParams.set('language', 'sl')

    const response = await fetch(url.toString(), { cache: 'no-store' })
    if (!response.ok) return null

    const data = await response.json()
    if (data?.status !== 'OK' || !Array.isArray(data?.results) || data.results.length === 0) {
      return null
    }

    const first = data.results[0]
    const components = Array.isArray(first.address_components) ? first.address_components : []
    const city =
      findAddressComponent(components, 'locality') ??
      findAddressComponent(components, 'postal_town') ??
      findAddressComponent(components, 'administrative_area_level_2')

    const region = findAddressComponent(components, 'administrative_area_level_1')
    const country = findAddressComponent(components, 'country')
    const lat = typeof first?.geometry?.location?.lat === 'number' ? first.geometry.location.lat : null
    const lng = typeof first?.geometry?.location?.lng === 'number' ? first.geometry.location.lng : null

    return {
      formattedAddress: first.formatted_address ?? query,
      city,
      region,
      country,
      lat,
      lng,
      placeId: first.place_id ?? null,
    }
  } catch {
    return null
  }
}

