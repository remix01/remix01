export interface CaseStudy {
  id: string
  title: string
  category: string
  location: string
  price: string
  duration: string
  rating: number
  thumbnail: string
  beforeImage: string
  afterImage: string
  description: string
  challenges: string[]
  solution: string
  craftsman: {
    name: string
    avatar: string
    specialty: string
    experience: string
  }
  priceBreakdown: {
    label: string
    amount: string
  }[]
}

export const caseStudies: CaseStudy[] = [
  {
    id: "kopalnica-ljubljana",
    title: "Prenova kopalnice",
    category: "Kopalnica",
    location: "Ljubljana",
    price: "2.400€",
    duration: "4 dni",
    rating: 5,
    thumbnail: "/placeholder.svg",
    beforeImage: "/placeholder.svg",
    afterImage: "/placeholder.svg",
    description:
      "Popolna prenova stare kopalnice v sodobno, svetlo in funkcionalno kopalnico. Zamenjava ploščic, sanitarij in opreme.",
    challenges: [
      "Stare cevi s korozijo",
      "Slaba hidroizolacija",
      "Omejen prostor za shranjevanje",
    ],
    solution:
      "Najprej smo zamenjali vse dotrajane cevi in naredili novo hidroizolacijo. Nato smo namestili sodoben tuš sistem, vgradili stensko pohištvo za optimizacijo prostora in izbrani velike svetle ploščice za vizualno povečanje prostora.",
    craftsman: {
      name: "Marko Novak",
      avatar: "/placeholder.svg",
      specialty: "Vodoinstalacije & Keramika",
      experience: "12 let",
    },
    priceBreakdown: [
      { label: "Material (ploščice, sanitarije)", amount: "1.200€" },
      { label: "Delo (4 dni)", amount: "960€" },
      { label: "Hidroizolacija", amount: "240€" },
    ],
  },
  {
    id: "elektrika-maribor",
    title: "Pametni dom z elektriko",
    category: "Elektrika",
    location: "Maribor",
    price: "1.800€",
    duration: "3 dni",
    rating: 5,
    thumbnail: "/placeholder.svg",
    beforeImage: "/placeholder.svg",
    afterImage: "/placeholder.svg",
    description:
      "Nadgradnja električne napeljave in implementacija pametnega sistema za nadzor osvetlitve, gretja in rolet.",
    challenges: [
      "Stara električna napeljava",
      "Ni zemeljske povezave",
      "Potrebna integracija s pametnim sistemom",
    ],
    solution:
      "Izvedli smo novo električno napeljavo z ustreznimi varnostnimi standardi, dodali FI-zaščito in namestili pametne stikale ter senzorje za popoln nadzor doma preko aplikacije.",
    craftsman: {
      name: "Janez Kovač",
      avatar: "/placeholder.svg",
      specialty: "Elektroinstalacije & Pametni dom",
      experience: "15 let",
    },
    priceBreakdown: [
      { label: "Material (kabli, stikala, senzorji)", amount: "800€" },
      { label: "Delo (3 dni)", amount: "720€" },
      { label: "Programiranje sistema", amount: "280€" },
    ],
  },
  {
    id: "kuhinja-celje",
    title: "Izdelava kuhinje po meri",
    category: "Mizarstvo",
    location: "Celje",
    price: "3.200€",
    duration: "5 dni",
    rating: 5,
    thumbnail: "/placeholder.svg",
    beforeImage: "/placeholder.svg",
    afterImage: "/placeholder.svg",
    description:
      "Načrtovanje in izdelava kuhinje po meri iz masivnega lesa z modernimi detajli in pametno izkoristbo prostora.",
    challenges: [
      "Nestandardna razporeditev prostora",
      "Želja po naravnih materialih",
      "Vključitev vseh električnih aparatov",
    ],
    solution:
      "Oblikovali smo 3D načrt po željah stranke, uporabili masiven hrast za omare in združili tradicionalno mizarstvo s sodobnimi dizajnerskimi elementi. Vgrajena vsa tehnologija in optimizirano skladiščenje.",
    craftsman: {
      name: "Tomaž Petric",
      avatar: "/placeholder.svg",
      specialty: "Mizarstvo po meri",
      experience: "18 let",
    },
    priceBreakdown: [
      { label: "Material (les, okovje)", amount: "1.600€" },
      { label: "Delo (5 dni)", amount: "1.200€" },
      { label: "3D načrt in montaža", amount: "400€" },
    ],
  },
]
