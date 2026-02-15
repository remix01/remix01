import Link from "next/link"
import { ArrowRight, Clock } from "lucide-react"
import { blogPosts } from "@/lib/blog-data"
import { Button } from "@/components/ui/button"
import { BlogIllustration } from "@/components/blog/BlogIllustration"

export function BlogPreview() {
  const featuredPosts = blogPosts.slice(0, 3)

  return (
    <section className="bg-background py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">
            Vodiči & Nasveti
          </p>
          <h2 className="mt-2 font-display text-[28px] sm:text-3xl font-bold tracking-tight text-foreground text-balance md:text-4xl">
            Koristne informacije za lastnike
          </h2>
          <p className="mt-4 text-[15px] sm:text-base text-muted-foreground leading-relaxed">
            Praktični nasveti, cenovni vodiči in strokovna mnenja za prenovo, gradnjo in vzdrževanje.
          </p>
        </div>

        <div className="mt-14 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {featuredPosts.map((post) => (
            <article
              key={post.id}
              className="group flex flex-col overflow-hidden rounded-2xl border bg-card transition-all hover:shadow-lg hover:border-primary/30"
            >
              <Link href={`/blog/${post.slug}`}>
                <div className="aspect-[16/10] overflow-hidden bg-[#0c0e14]">
                  <BlogIllustration 
                    category={post.illustrationCategory} 
                    className="h-full w-full transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <div className="flex items-center gap-3 text-sm">
                    <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                      {post.category}
                    </span>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{post.readTime} min</span>
                    </div>
                  </div>
                  
                  <h3 className="mt-4 font-display text-xl font-semibold text-foreground group-hover:text-primary transition-colors">
                    {post.title}
                  </h3>
                  
                  <p className="mt-3 flex-1 text-sm text-muted-foreground leading-relaxed">
                    {post.excerpt}
                  </p>
                  
                  <div className="mt-4 flex items-center gap-1.5 text-sm font-medium text-primary">
                    <span>Preberi več</span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </Link>
            </article>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Button asChild size="lg" variant="outline">
            <Link href="/blog">
              Vsi vodiči
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
