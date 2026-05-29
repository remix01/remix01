// SEO Locations - Slovenian cities and regions
export const SLOVENIAN_CITIES = [
  // Osrednjeslovenska
  { name: 'Ljubljana', slug: 'ljubljana', region: 'Osrednjeslovenska' },
  { name: 'Domžale', slug: 'domzale', region: 'Osrednjeslovenska' },
  { name: 'Kamnik', slug: 'kamnik', region: 'Osrednjeslovenska' },
  { name: 'Logatec', slug: 'logatec', region: 'Osrednjeslovenska' },
  { name: 'Grosuplje', slug: 'grosuplje', region: 'Osrednjeslovenska' },
  // Podravska
  { name: 'Maribor', slug: 'maribor', region: 'Podravska' },
  { name: 'Ptuj', slug: 'ptuj', region: 'Podravska' },
  { name: 'Ljutomer', slug: 'ljutomer', region: 'Podravska' },
  { name: 'Ormož', slug: 'ormoz', region: 'Podravska' },
  // Savinjska
  { name: 'Celje', slug: 'celje', region: 'Savinjska' },
  { name: 'Velenje', slug: 'velenje', region: 'Savinjska' },
  { name: 'Laško', slug: 'lasko', region: 'Savinjska' },
  { name: 'Žalec', slug: 'zalec', region: 'Savinjska' },
  { name: 'Šentjur', slug: 'sentjur', region: 'Savinjska' },
  // Gorenjska
  { name: 'Kranj', slug: 'kranj', region: 'Gorenjska' },
  { name: 'Jesenice', slug: 'jesenice', region: 'Gorenjska' },
  { name: 'Škofja Loka', slug: 'skofja-loka', region: 'Gorenjska' },
  { name: 'Radovljica', slug: 'radovljica', region: 'Gorenjska' },
  { name: 'Tržič', slug: 'trzic', region: 'Gorenjska' },
  // Obalno-kraška
  { name: 'Koper', slug: 'koper', region: 'Obalno-kraška' },
  { name: 'Piran', slug: 'piran', region: 'Obalno-kraška' },
  { name: 'Izola', slug: 'izola', region: 'Obalno-kraška' },
  // Goriška
  { name: 'Nova Gorica', slug: 'nova-gorica', region: 'Goriška' },
  { name: 'Ajdovščina', slug: 'ajdovscina', region: 'Goriška' },
  { name: 'Idrija', slug: 'idrija', region: 'Goriška' },
  // Jugovzhodna Slovenija
  { name: 'Novo mesto', slug: 'novo-mesto', region: 'Jugovzhodna Slovenija' },
  { name: 'Kočevje', slug: 'kocevje', region: 'Jugovzhodna Slovenija' },
  // Posavska
  { name: 'Brežice', slug: 'brezice', region: 'Posavska' },
  { name: 'Krško', slug: 'krsko', region: 'Posavska' },
  { name: 'Sevnica', slug: 'sevnica', region: 'Posavska' },
  // Zasavska
  { name: 'Trbovlje', slug: 'trbovlje', region: 'Zasavska' },
  // Primorsko-notranjska
  { name: 'Postojna', slug: 'postojna', region: 'Primorsko-notranjska' },
  // Pomurska
  { name: 'Murska Sobota', slug: 'murska-sobota', region: 'Pomurska' },
  // Koroška
  { name: 'Slovenj Gradec', slug: 'slovenj-gradec', region: 'Koroška' },
  { name: 'Ravne na Koroškem', slug: 'ravne-na-koroskem', region: 'Koroška' },
] as const

export function getCityBySlug(slug: string) {
  return SLOVENIAN_CITIES.find((c: any) => c.slug === slug)
}

export function getCityName(slug: string): string {
  return getCityBySlug(slug)?.name || slug
}
