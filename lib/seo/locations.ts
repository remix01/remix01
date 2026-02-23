// SEO Locations - Slovenian cities and regions
export const SLOVENIAN_CITIES = [
  { name: 'Ljubljana', slug: 'ljubljana', region: 'Osrednjeslovenska' },
  { name: 'Maribor', slug: 'maribor', region: 'Podravska' },
  { name: 'Celje', slug: 'celje', region: 'Savinjska' },
  { name: 'Kranj', slug: 'kranj', region: 'Gorenjska' },
  { name: 'Koper', slug: 'koper', region: 'Obalno-kraška' },
  { name: 'Velenje', slug: 'velenje', region: 'Savinjska' },
  { name: 'Novo mesto', slug: 'novo-mesto', region: 'Jugovzhodna Slovenija' },
  { name: 'Ptuj', slug: 'ptuj', region: 'Podravska' },
  { name: 'Trbovlje', slug: 'trbovlje', region: 'Zasavska' },
  { name: 'Kamnik', slug: 'kamnik', region: 'Osrednjeslovenska' },
  { name: 'Jesenice', slug: 'jesenice', region: 'Gorenjska' },
  { name: 'Nova Gorica', slug: 'nova-gorica', region: 'Goriška' },
  { name: 'Domžale', slug: 'domzale', region: 'Osrednjeslovenska' },
  { name: 'Škofja Loka', slug: 'skofja-loka', region: 'Gorenjska' },
  { name: 'Murska Sobota', slug: 'murska-sobota', region: 'Pomurska' }
] as const

export function getCityBySlug(slug: string) {
  return SLOVENIAN_CITIES.find(c => c.slug === slug)
}

export function getCityName(slug: string): string {
  return getCityBySlug(slug)?.name || slug
}
