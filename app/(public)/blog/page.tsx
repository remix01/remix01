import type { Metadata } from 'next'
import { getAllPosts } from '@/lib/blog'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowRight, Calendar, Clock, Tag } from 'lucide-react'
import { Breadcrumb } from '@/components/seo/breadcrumb'

export const metadata: Metadata = {
  title: 'Vodiči & Nasveti | LiftGO Blog',
  description: 'Praktični nasveti za prenove, gradnjo in popravila. Cenovni vodiči, strokovni nasveti in izkušnje.',
  openGraph: {
    title: 'Vodiči & Nasveti | LiftGO Blog',
    description: 'Praktični nasveti za prenove, gradnjo in popravila.',
    type: 'website',
    url: 'https://liftgo.net/blog'
  }
}

export default async function BlogPage() {
  const posts = await getAllPosts()

  return (
    <>
      <Breadcrumb items={[
        { name: 'Domov', href: '/' },
        { name: 'Blog', href: '/blog' }
      ]} />

      <main className="min-h-screen">
        {/* Hero Section */}
        <section className="py-12 md:py-20 bg-gradient-to-b from-blue-50 to-white">
          <div className="max-w-6xl mx-auto px-4">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-balance">
              Vodiči & Nasveti za lastnike
            </h1>
            <p className="text-lg text-gray-600 mb-8 max-w-2xl">
              Praktični nasveti, cenovni vodiči in strokovna mnenja. Vse, kar morate vedeti o prenovih, gradnji in popravilih.
            </p>
          </div>
        </section>

        {/* Blog Posts Grid */}
        <section className="py-12 md:py-20">
          <div className="max-w-6xl mx-auto px-4">
            {posts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {posts.map(post => (
                  <article
                    key={post.slug}
                    className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow flex flex-col h-full"
                  >
                    <div className="p-6 flex flex-col h-full">
                      {/* Category Badge */}
                      <div className="flex items-center gap-2 mb-3">
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                          <Tag className="w-3 h-3" />
                          {post.category}
                        </span>
                      </div>

                      {/* Title */}
                      <h2 className="text-xl font-bold mb-3 line-clamp-2 flex-grow">
                        {post.title}
                      </h2>

                      {/* Description */}
                      <p className="text-gray-600 text-sm mb-4 line-clamp-3 flex-grow">
                        {post.description}
                      </p>

                      {/* Meta Info */}
                      <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <time dateTime={post.date}>
                            {new Date(post.date).toLocaleDateString('sl-SI', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </time>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {post.readTime} min
                        </div>
                      </div>

                      {/* Read More Link */}
                      <Link
                        href={`/blog/${post.slug}`}
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium text-sm mt-auto"
                      >
                        Preberi več
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-lg text-gray-600 mb-6">Prispevkov ni na voljo.</p>
              </div>
            )}
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-12 md:py-20 bg-blue-50">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-4">
              Potrebujete strokovnjaka?
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              Na LiftGO lahko hitro najdete preverjene mojstre v vaši kategoriji in lokaciji.
            </p>
            <Link href="/narocnik/novo-povprasevanje">
              <Button size="lg" className="gap-2">
                Oddaj povpraševanje
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </section>
      </main>
    </>
  )
}
