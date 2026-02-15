"use client"

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { ArrowRight, Clock, Search } from 'lucide-react'
import { blogPosts, blogCategories, type BlogCategory } from '@/lib/blog-data'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function BlogContent() {
  const [selectedCategory, setSelectedCategory] = useState<BlogCategory | 'Vse'>('Vse')
  const [searchQuery, setSearchQuery] = useState('')

  const filteredPosts = useMemo(() => {
    let filtered = blogPosts

    if (selectedCategory !== 'Vse') {
      filtered = filtered.filter(post => post.category === selectedCategory)
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(post =>
        post.title.toLowerCase().includes(query) ||
        post.excerpt.toLowerCase().includes(query)
      )
    }

    return filtered
  }, [selectedCategory, searchQuery])

  return (
    <>
      {/* Header */}
      <section className="bg-muted/50 py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-foreground md:text-5xl">
              Vodiči & Nasveti
            </h1>
            <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed">
              Praktični nasveti, cenovni vodiči in strokovna mnenja za prenovo, gradnjo in vzdrževanje vašega doma.
            </p>
          </div>
        </div>
      </section>

      {/* Filters & Search */}
      <section className="border-b bg-background py-8">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            {/* Category Filters */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedCategory === 'Vse' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory('Vse')}
              >
                Vse
              </Button>
              {blogCategories.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </Button>
              ))}
            </div>

            {/* Search */}
            <div className="relative w-full lg:w-80">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Išči vodiče..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Blog Grid */}
      <section className="bg-background py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          {filteredPosts.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-lg text-muted-foreground">
                Ni najdenih vodičev za izbrane kriterije.
              </p>
            </div>
          ) : (
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {filteredPosts.map((post) => (
                <article
                  key={post.id}
                  className="group flex flex-col overflow-hidden rounded-2xl border bg-card transition-all hover:shadow-lg hover:border-primary/30"
                >
                  <Link href={`/blog/${post.slug}`}>
                    <div className="aspect-[16/10] overflow-hidden bg-muted">
                      {post.image ? (
                        <img
                          src={post.image}
                          alt={post.title}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-primary/10">
                          <span className="text-4xl text-primary/40">{post.category[0]}</span>
                        </div>
                      )}
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
          )}
        </div>
      </section>
    </>
  )
}
