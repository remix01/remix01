import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPostBySlug, getAllPosts, getRelatedPosts } from '@/lib/blog'
import { Breadcrumb } from '@/components/seo/breadcrumb'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowRight, Calendar, Clock, Tag, User } from 'lucide-react'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  const posts = await getAllPosts()
  return posts.map(post => ({
    slug: post.slug
  }))
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params
  const post = await getPostBySlug(params.slug)

  if (!post) {
    return {}
  }

  return {
    title: `${post.title} | LiftGO Blog`,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      type: 'article',
      url: `https://liftgo.net/blog/${post.slug}`,
      publishedTime: post.date
    }
  }
}

export default async function BlogPostPage(props: Props) {
  const params = await props.params
  const post = await getPostBySlug(params.slug)

  if (!post) {
    notFound()
  }

  // Use post content directly as plain text
  const contentParagraphs = post.content
    .split('\n\n')
    .filter(p => p.trim().length > 0)

  // Get related posts
  const relatedPosts = await getRelatedPosts(post.category, post.slug, 3)

  // Generate Article schema
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    'headline': post.title,
    'description': post.description,
    'datePublished': post.date,
    'author': {
      '@type': 'Organization',
      'name': 'Ekipa LiftGO',
      'url': 'https://liftgo.net'
    },
    'publisher': {
      '@type': 'Organization',
      'name': 'LiftGO',
      'url': 'https://liftgo.net'
    }
  }

  // Generate Breadcrumb schema
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': [
      {
        '@type': 'ListItem',
        'position': 1,
        'name': 'Domov',
        'item': 'https://liftgo.net'
      },
      {
        '@type': 'ListItem',
        'position': 2,
        'name': 'Blog',
        'item': 'https://liftgo.net/blog'
      },
      {
        '@type': 'ListItem',
        'position': 3,
        'name': post.title,
        'item': `https://liftgo.net/blog/${post.slug}`
      }
    ]
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <Breadcrumb items={[
        { name: 'Domov', href: '/' },
        { name: 'Blog', href: '/blog' },
        { name: post.title, href: `/blog/${post.slug}` }
      ]} />

      <main className="min-h-screen">
        {/* Article Header */}
        <section className="py-12 md:py-16 bg-gradient-to-b from-blue-50 to-white">
          <div className="max-w-4xl mx-auto px-4">
            <div className="flex items-center gap-2 mb-4">
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded">
                <Tag className="w-4 h-4" />
                {post.category}
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl font-bold mb-6 text-balance">
              {post.title}
            </h1>

            <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span>Ekipa LiftGO</span>
              </div>

              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <time dateTime={post.date}>
                  {new Date(post.date).toLocaleDateString('sl-SI', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </time>
              </div>

              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>{post.readTime} min branja</span>
              </div>
            </div>
          </div>
        </section>

        {/* Article Content */}
        <section className="py-12 md:py-16">
          <div className="max-w-4xl mx-auto px-4">
            <article className="prose prose-sm md:prose-base max-w-none">
              {contentParagraphs.map((paragraph, i) => (
                <p key={i} className="text-gray-700 leading-relaxed mb-4">
                  {paragraph}
                </p>
              ))}
            </article>
          </div>
        </section>

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <section className="py-12 md:py-20 bg-gray-50">
            <div className="max-w-6xl mx-auto px-4">
              <h2 className="text-3xl font-bold mb-12">Sorodni članki</h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {relatedPosts.map(relatedPost => (
                  <article
                    key={relatedPost.slug}
                    className="border bg-white rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                  >
                    <div className="p-6">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                          {relatedPost.category}
                        </span>
                      </div>

                      <h3 className="text-lg font-bold mb-2 line-clamp-2">
                        {relatedPost.title}
                      </h3>

                      <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                        {relatedPost.description}
                      </p>

                      <Link
                        href={`/blog/${relatedPost.slug}`}
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium text-sm"
                      >
                        Preberi več
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* CTA Section */}
        <section className="py-12 md:py-20 bg-blue-600 text-white">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-4">
              Iščete mojstra za {post.category}?
            </h2>
            <p className="text-lg mb-8 text-blue-100">
              Na LiftGO lahko hitro oddajte povpraševanje in prejemete ponudbe od preverjenih mojstrov.
            </p>
            <Link href="/narocnik/novo-povprasevanje">
              <Button size="lg" variant="secondary" className="gap-2">
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
