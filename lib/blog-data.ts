export type BlogCategory = 'Vodovod' | 'Elektrika' | 'Gradnja' | 'Zaključna dela' | 'Vzdrževanje'
export type IllustrationCategory = 'kopalnica' | 'elektrikar' | 'vodovod' | 'fasada' | 'parket' | 'vzdrzevanje'

export interface BlogPost {
  id: string
  slug: string
  title: string
  excerpt: string
  category: BlogCategory
  illustrationCategory: IllustrationCategory
  readTime: number
  publishedAt: string
  author: string
  content?: string
  image?: string
}

export const blogPosts: BlogPost[] = [
  {
    id: '1',
    slug: 'koliko-stane-prenova-kopalnice-ljubljana-2026',
    title: 'Koliko stane prenova kopalnice v Ljubljani 2026',
    excerpt: 'Celovit vodič po cenah prenove kopalnice: od materialov do dela. Preberite, kaj vpliva na končno ceno in kako prihraniti.',
    category: 'Gradnja',
    illustrationCategory: 'kopalnica',
    readTime: 8,
    publishedAt: '2026-02-10',
    author: 'LiftGO'
  },
  {
    id: '2',
    slug: 'kako-izbrati-elektroinatalaterja',
    title: 'Kako izbrati zanesljivega elektroinštalaterja',
    excerpt: 'Na kaj morate biti pozorni pri izbiri elektrikarja? 7 ključnih kriterijev za varno in kakovostno delo.',
    category: 'Elektrika',
    illustrationCategory: 'elektrikar',
    readTime: 6,
    publishedAt: '2026-02-08',
    author: 'LiftGO'
  },
  {
    id: '3',
    slug: 'znaki-da-vodovodna-napeljava-potrebuje-menjavo',
    title: '5 znakov, da vaša vodovodna napeljava potrebuje menjavo',
    excerpt: 'Kako prepoznati, kdaj je potrebna menjava cevi? Odkrijte zgodnje znake, ki napovedujejo težave z vodovodom.',
    category: 'Vodovod',
    illustrationCategory: 'vodovod',
    readTime: 5,
    publishedAt: '2026-02-05',
    author: 'LiftGO'
  },
  {
    id: '4',
    slug: 'vzdrževanje-fasade-priporocila',
    title: 'Vzdrževanje fasade: Kaj morate vedeti',
    excerpt: 'Kdaj in kako vzdrževati fasado? Strokovni nasveti za dolgotrajno zaščito vašega doma.',
    category: 'Gradnja',
    illustrationCategory: 'fasada',
    readTime: 7,
    publishedAt: '2026-02-01',
    author: 'LiftGO'
  },
  {
    id: '5',
    slug: 'polaganje-parketa-napake',
    title: 'Najpogostejše napake pri polaganju parketa',
    excerpt: 'Izognite se dragim napakam pri polaganju parketa. Kaj storiti pred, med in po polaganju.',
    category: 'Zaključna dela',
    illustrationCategory: 'parket',
    readTime: 6,
    publishedAt: '2026-01-28',
    author: 'LiftGO'
  },
  {
    id: '6',
    slug: 'preventivno-vzdrževanje-doma',
    title: 'Preventivno vzdrževanje: Vodnik za lastnike',
    excerpt: 'Redno vzdrževanje lahko prepreči drage popravile. Seznam obveznih pregledov za vaš dom.',
    category: 'Vzdrževanje',
    illustrationCategory: 'vzdrzevanje',
    readTime: 9,
    publishedAt: '2026-01-25',
    author: 'LiftGO'
  }
]

export function getBlogPostBySlug(slug: string): BlogPost | undefined {
  return blogPosts.find(post => post.slug === slug)
}

export function getBlogPostsByCategory(category?: BlogCategory): BlogPost[] {
  if (!category) return blogPosts
  return blogPosts.filter(post => post.category === category)
}

export const blogCategories: BlogCategory[] = ['Vodovod', 'Elektrika', 'Gradnja', 'Zaključna dela', 'Vzdrževanje']
