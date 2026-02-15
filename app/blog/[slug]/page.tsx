import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, Clock, Calendar } from 'lucide-react'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { JsonLd } from '@/app/components/JsonLd'
import { getBlogPostBySlug, blogPosts } from '@/lib/blog-data'

interface BlogPostPageProps {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return blogPosts.map((post) => ({
    slug: post.slug,
  }))
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params
  const post = getBlogPostBySlug(slug)

  if (!post) {
    return {
      title: 'Članek ni najden',
    }
  }

  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: `${post.title} | LiftGO`,
      description: post.excerpt,
      type: 'article',
      publishedTime: post.publishedAt,
      authors: [post.author],
    },
  }
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params
  const post = getBlogPostBySlug(slug)

  if (!post) {
    notFound()
  }

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": post.title,
    "description": post.excerpt,
    "author": {
      "@type": "Organization",
      "name": post.author,
      "url": "https://www.liftgo.net"
    },
    "publisher": {
      "@type": "Organization",
      "name": "LiftGO",
      "logo": {
        "@type": "ImageObject",
        "url": "https://www.liftgo.net/logo.png"
      }
    },
    "datePublished": post.publishedAt,
    "dateModified": post.publishedAt,
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `https://www.liftgo.net/blog/${post.slug}`
    },
    "image": post.image ? `https://www.liftgo.net${post.image}` : undefined,
    "articleSection": post.category,
    "inLanguage": "sl-SI"
  }

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Domov",
        "item": "https://www.liftgo.net"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Blog",
        "item": "https://www.liftgo.net/blog"
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": post.category,
        "item": `https://www.liftgo.net/blog?category=${encodeURIComponent(post.category)}`
      },
      {
        "@type": "ListItem",
        "position": 4,
        "name": post.title,
        "item": `https://www.liftgo.net/blog/${post.slug}`
      }
    ]
  }

  return (
    <>
      <JsonLd data={articleSchema} />
      <JsonLd data={breadcrumbSchema} />
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1">
          {/* Breadcrumbs */}
          <section className="border-b bg-muted/30 py-4">
            <div className="mx-auto max-w-4xl px-4 lg:px-8">
              <nav className="flex items-center gap-2 text-sm text-muted-foreground" aria-label="Breadcrumb">
                <Link href="/" className="hover:text-foreground transition-colors">
                  Domov
                </Link>
                <ChevronRight className="h-4 w-4" />
                <Link href="/blog" className="hover:text-foreground transition-colors">
                  Blog
                </Link>
                <ChevronRight className="h-4 w-4" />
                <span className="text-foreground">{post.category}</span>
                <ChevronRight className="h-4 w-4" />
                <span className="text-foreground truncate">{post.title}</span>
              </nav>
            </div>
          </section>

          {/* Article Header */}
          <article className="py-12 lg:py-16">
            <div className="mx-auto max-w-4xl px-4 lg:px-8">
              <header>
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                    {post.category}
                  </span>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    <time dateTime={post.publishedAt}>
                      {new Date(post.publishedAt).toLocaleDateString('sl-SI', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </time>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{post.readTime} min branja</span>
                  </div>
                </div>

                <h1 className="mt-6 font-display text-3xl sm:text-4xl font-bold tracking-tight text-foreground md:text-5xl">
                  {post.title}
                </h1>

                <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
                  {post.excerpt}
                </p>
              </header>

              {post.image && (
                <div className="mt-10 overflow-hidden rounded-2xl">
                  <img
                    src={post.image}
                    alt={post.title}
                    className="h-auto w-full object-cover"
                  />
                </div>
              )}

              {/* Article Content */}
              <div className="prose prose-slate mt-10 max-w-none prose-headings:font-display prose-headings:font-semibold prose-h2:text-2xl prose-h3:text-xl prose-a:text-primary prose-a:no-underline hover:prose-a:underline">
                <p className="text-lg leading-relaxed">
                  {post.content || 'Vsebina članka bo kmalu na voljo. Ta članek je trenutno v pripravi in bo objavljen v kratkem.'}
                </p>
              </div>

              {/* Back to Blog */}
              <div className="mt-12 border-t pt-8">
                <Link
                  href="/blog"
                  className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                >
                  ← Nazaj na vse vodiče
                </Link>
              </div>
            </div>
          </article>
        </main>
        <Footer />
      </div>
    </>
  )
}
