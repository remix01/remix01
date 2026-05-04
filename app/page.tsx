import type { Metadata } from 'next'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { JsonLd } from './components/JsonLd'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { HeroSection } from '@/components/home/HeroSection'
import { HowItWorksTabs } from '@/components/home/HowItWorksTabs'
import { LiveActivityTicker } from '@/components/home/LiveActivityTicker'
import { CategoryCityGrid } from '@/components/home/CategoryCityGrid'
import { Testimonials } from '@/components/home/Testimonials'
import { FinalCTA } from '@/components/home/FinalCTA'
import { AIConciergeLazy } from '@/components/home/AIConciergeLazy'
import { PortalOverviewSection } from '@/components/home/PortalOverviewSection'
import { AdvancedFeaturesSection } from '@/components/home/AdvancedFeaturesSection'
import type { HomeActivityItem, HomeStats, HomeTestimonial } from '@/components/home/types'
import { getActiveCategoriesPublic } from '@/lib/dal/categories'

export const revalidate = 180
export const metadata: Metadata = {
  title: 'LiftGO — Mojster za vsak dom',
  description:
    'Najdite preverjenega mojstra ali postanite LiftGO partner. AI Concierge pomaga izbrati pravo kategorijo in oceno cene.',
  alternates: {
    canonical: 'https://www.liftgo.net',
  },
}

const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'LiftGO',
  url: 'https://www.liftgo.net',
  description:
    'Platforma za iskanje zanesljivih obrtnikov po vsej Sloveniji. Brezplačno povpraševanje, odziv v 24 urah.',
  inLanguage: 'sl-SI',
}

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Kako deluje LiftGO?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Oddajte brezplačno povpraševanje, mi pa vas povežemo s preverjenimi obrtniki v vaši okolici. Ponudbe prejmete v 24 urah.',
      },
    },
    {
      '@type': 'Question',
      name: 'Ali je oddaja povpraševanja brezplačna?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Da, oddaja povpraševanja je za stranke popolnoma brezplačna. Plačate šele, ko se dogovorite z izbranim mojstrom.',
      },
    },
    {
      '@type': 'Question',
      name: 'Kako so preverjeni mojstri na LiftGO?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Vsak obrtnik gre skozi postopek preverjanja identitete in poklicnih referenc. Na platformi so prikazani samo verificirani mojstri.',
      },
    },
    {
      '@type': 'Question',
      name: 'Kako hitro dobim ponudbe?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Večina strank prejme prve ponudbe v 24 urah po oddaji povpraševanja.',
      },
    },
  ],
}


interface ReviewRow {
  id: string
  rating: number
  comment: string
  profiles: {
    full_name: string | null
  } | null
}

interface ActivityRow {
  id: string
  location_city: string | null
  categories: { name: string } | null
  created_at: string
}

async function getHomeData(): Promise<{
  stats: HomeStats
  testimonials: HomeTestimonial[]
  activity: HomeActivityItem[]
  featuredCategories: Array<{ label: string; slug: string }>
}> {
  try {
    const [activeCraftsmenQuery, reviewsQuery, ratingsAggQuery, activityQuery, categoriesQuery] = await Promise.all([
      supabaseAdmin
        .from('obrtnik_profiles')
        .select('id', { count: 'exact', head: true })
        .eq('is_verified', true),
      supabaseAdmin
        .from('ocene')
        .select('id, rating, comment, profiles:profiles!ocene_narocnik_id_fkey(full_name)')
        .eq('rating', 5)
        .not('comment', 'is', null)
        .order('created_at', { ascending: false })
        .limit(6),
      // Single-row aggregate — no row data shipped, just count + avg
      supabaseAdmin
        .rpc('get_ratings_summary'),
      supabaseAdmin
        .from('povprasevanja')
        .select('id, location_city, categories(name), created_at')
        .order('created_at', { ascending: false })
        .limit(8),
      getActiveCategoriesPublic(),
    ])

    const MIN_REVIEWS_FOR_RATING = 10
    const totalReviews = (ratingsAggQuery.data as any)?.total ?? 0
    const rawAvg = (ratingsAggQuery.data as any)?.avg ?? null
    const avgRating: number | null =
      totalReviews >= MIN_REVIEWS_FOR_RATING && rawAvg != null
        ? Math.round(Number(rawAvg) * 10) / 10
        : null

    const stats: HomeStats = {
      rating: avgRating,
      reviews: totalReviews >= MIN_REVIEWS_FOR_RATING ? totalReviews : null,
      activeCraftsmen: activeCraftsmenQuery.count ?? null,
    }

    const testimonials: HomeTestimonial[] = ((reviewsQuery.data as ReviewRow[] | null) || []).map((review) => {
      const fullName = review.profiles?.full_name || 'Zadovoljna stranka'
      const nameParts = String(fullName).split(' ')
      return {
        id: review.id,
        name: `${nameParts[0]} ${nameParts[1] ? `${nameParts[1][0]}.` : ''}`.trim(),
        avatar: nameParts.slice(0, 2).map((namePart) => namePart[0]).join('').toUpperCase(),
        comment: review.comment,
        rating: review.rating,
      }
    })

    const fallbackTestimonials: HomeTestimonial[] = []

    const activity: HomeActivityItem[] = ((activityQuery.data as ActivityRow[] | null) || []).map((item) => ({
      id: item.id,
      city: item.location_city || 'neznano mesto',
      category: item.categories?.name || 'splošno storitev',
      createdAt: item.created_at,
    }))

    const featuredCategories = categoriesQuery
      .map((category) => ({ label: category.name, slug: category.slug }))

    return {
      stats,
      testimonials: testimonials.length ? testimonials : fallbackTestimonials,
      activity,
      featuredCategories,
    }
  } catch (error) {
    console.error('[homepage] Failed to load server data:', error)
    return {
      stats: { rating: null, reviews: null, activeCraftsmen: null },
      testimonials: [],
      activity: [],
      featuredCategories: [],
    }
  }
}

export default async function Page() {
  const { stats, testimonials, activity, featuredCategories } = await getHomeData()

  return (
    <div className="flex min-h-screen flex-col">
      <JsonLd data={websiteSchema} />
      <JsonLd data={faqSchema} />
      <Navbar />
      <main className="flex-1 pb-20 sm:pb-0">
        <HeroSection stats={stats} categories={featuredCategories} />
        <LiveActivityTicker initialItems={activity} />
        <HowItWorksTabs />
        <PortalOverviewSection />
        <AdvancedFeaturesSection />
        <CategoryCityGrid categories={featuredCategories} />
        <Testimonials testimonials={testimonials} />
        <FinalCTA />
      </main>
      <Footer />
      <AIConciergeLazy />
    </div>
  )
}
