export interface ServiceAreasData {
  id: string
  obrtnik_id: string
  city: string
  region: string | null
  radius_km: number | null
  lat: number | null
  lng: number | null
  is_active: boolean | null
  created_at: string | null
}
