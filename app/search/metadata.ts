export const categoryMetadata: Record<string, { title: string; description: string }> = {
  'vodovod-ogrevanje': {
    title: 'Vodovodar v {location} | LiftGO — Preverjeni mojstri',
    description: 'Najdite verificiranega vodovoda v {location}. Hiter odziv v manj kot 24 urah. Centralno ogrevanje, talno ogrevanje, toplotne črpalke. 4.9★ povprečna ocena.',
  },
  'elektrika-pametni-sistemi': {
    title: 'Elektrikar v {location} | LiftGO — Certificirani elektro mojstri',
    description: 'Poiščite kvalificiranega elektrikarja v {location}. Elektroinstalacije, pametni dom, video nadzor, alarmni sistemi. Certificirani strokovnjaki.',
  },
  'gradnja-adaptacije': {
    title: 'Gradbenik v {location} | LiftGO — Prenove in adaptacije',
    description: 'Zanesljivi gradbinci v {location} za adaptacije, prenove kopalnic, fasade in betonska dela. Preverjene reference, hiter odziv.',
  },
  'mizarstvo-kovinarstvo': {
    title: 'Mizar v {location} | LiftGO — Kuhinje in pohištvo po meri',
    description: 'Profesionalni mizarji v {location}. Kuhinje po meri, vgradne omare, kovinske konstrukcije, stopnice. Top mojstri z referencami.',
  },
  'zakljucna-dela': {
    title: 'Ličar v {location} | LiftGO — Beljenje in zaključna dela',
    description: 'Natančni ličarji in slikopleskarji v {location}. Beljenje, tapete, dekorativne tehnike. Kakovostna zaključna dela po konkurenčnih cenah.',
  },
  'okna-vrata-sencila': {
    title: 'Montaža oken v {location} | LiftGO — Okna, vrata, rolete',
    description: 'Specialist za montažo oken in senčil v {location}. PVC in lesena okna, rolete, žaluzije, komarniki. Garancija na delo.',
  },
  'okolica-zunanja-ureditev': {
    title: 'Vrtnar v {location} | LiftGO — Urejanje okolice',
    description: 'Strokovnjaki za urejanje okolice v {location}. Tlakovanje, namakanje, zasaditev, vzdrževanje. Kreativne rešitve za vaš vrt.',
  },
  'vzdrzevanje-popravila': {
    title: 'Hišnistvo v {location} | LiftGO — Popravila na domu',
    description: 'Zanesljiv servis za manjša popravila v {location}. Hišniška dela, montaža, vzdrževanje. Hiter odziv, dostopne cene.',
  },
  'default': {
    title: 'Najdi obrtnika v {location} | LiftGO',
    description: 'Povežite se s preverjenimi obrtniki v {location}. Več kot 225 mojstrov v vsej Sloveniji. Odziv v manj kot 2 urah, brezplačno povpraševanje.',
  },
}

export function getCategoryKey(category: string | null): string {
  if (!category) return 'default'

  const normalized = category
    .toLowerCase()
    .replace(/\s+&\s+/g, '-')
    .replace(/\s+/g, '-')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

  return Object.keys(categoryMetadata).includes(normalized) ? normalized : 'default'
}

export function getMetadataForCategory(category: string | null, location: string | null) {
  const categoryKey = getCategoryKey(category)
  const meta = categoryMetadata[categoryKey]
  const loc = location || 'Sloveniji'

  return {
    title: meta.title.replace('{location}', loc),
    description: meta.description.replace(/{location}/g, loc),
  }
}
