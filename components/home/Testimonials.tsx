'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, Star } from 'lucide-react'
import type { HomeTestimonial } from './types'

interface TestimonialsProps {
  testimonials: HomeTestimonial[]
}

export function Testimonials({ testimonials }: TestimonialsProps) {
  const [index, setIndex] = useState(0)

  if (!testimonials.length) return null

  const active = testimonials[index]

  return (
    <section className="mx-auto max-w-4xl px-4 py-16 text-center lg:px-8">
      <h2 className="text-3xl font-bold tracking-tight">Mnenja zadovoljnih uporabnikov</h2>

      <div className="mt-8 rounded-2xl border bg-card p-8">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
          {active.avatar}
        </div>
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground">“{active.comment}”</p>
        <div className="mt-4 flex items-center justify-center gap-1">
          {Array.from({ length: active.rating }).map((_, i) => (
            <Star key={i} className="h-4 w-4 fill-amber-500 text-amber-500" />
          ))}
        </div>
        <p className="mt-2 font-medium">{active.name}</p>
      </div>

      {testimonials.length > 1 && (
        <div className="mt-4 flex justify-center gap-3">
          <button className="min-h-11 min-w-11 rounded-full border" onClick={() => setIndex((prev) => (prev === 0 ? testimonials.length - 1 : prev - 1))}>
            <ChevronLeft className="mx-auto h-4 w-4" />
          </button>
          <button className="min-h-11 min-w-11 rounded-full border" onClick={() => setIndex((prev) => (prev + 1) % testimonials.length)}>
            <ChevronRight className="mx-auto h-4 w-4" />
          </button>
        </div>
      )}
    </section>
  )
}
