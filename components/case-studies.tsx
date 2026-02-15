"use client"

import { useState, useEffect, useRef } from "react"
import { Star, MapPin, Clock, Euro } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { caseStudies, type CaseStudy } from "@/lib/case-studies-data"
import { CaseStudyModal } from "@/components/case-study-modal"

export function CaseStudies() {
  const [selectedCase, setSelectedCase] = useState<CaseStudy | null>(null)
  const [visibleCards, setVisibleCards] = useState<boolean[]>([false, false, false])
  const sectionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            caseStudies.forEach((_, index) => {
              setTimeout(() => {
                setVisibleCards((prev) => {
                  const newVisible = [...prev]
                  newVisible[index] = true
                  return newVisible
                })
              }, index * 150)
            })
          }
        })
      },
      { threshold: 0.1 }
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <>
      <section ref={sectionRef} className="bg-background py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-primary">
              Resnični primeri
            </p>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-foreground text-balance md:text-4xl lg:text-5xl">
              Uspešno zaključena dela
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              Oglejte si resnične projekte, ki so jih naši obrtniki izvedli za stranke po vsej Sloveniji.
            </p>
          </div>

          <div className="mt-14 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {caseStudies.map((caseStudy, index) => (
              <Card
                key={caseStudy.id}
                className={`group cursor-pointer overflow-hidden border-2 transition-all duration-500 hover:border-primary hover:shadow-xl ${
                  visibleCards[index]
                    ? "translate-y-0 opacity-100"
                    : "translate-y-10 opacity-0"
                }`}
                onClick={() => setSelectedCase(caseStudy)}
              >
                <CardContent className="p-0">
                  {/* Image */}
                  <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
                      <span className="font-display text-6xl font-bold text-primary/10">
                        {caseStudy.category[0]}
                      </span>
                    </div>
                    <div className="absolute right-3 top-3">
                      <Badge className="bg-background/90 text-foreground backdrop-blur-sm">
                        {caseStudy.category}
                      </Badge>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    <h3 className="font-display text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                      {caseStudy.title}
                    </h3>

                    {/* Meta Info */}
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>{caseStudy.location}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>{caseStudy.duration}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm font-medium text-primary">
                        <Euro className="h-4 w-4" />
                        <span>{caseStudy.price}</span>
                      </div>
                    </div>

                    {/* Rating */}
                    <div className="mt-4 flex items-center gap-1 border-t pt-4">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < caseStudy.rating
                              ? "fill-accent text-accent"
                              : "fill-muted text-muted"
                          }`}
                        />
                      ))}
                      <span className="ml-2 text-sm font-medium text-foreground">
                        {caseStudy.rating}.0
                      </span>
                    </div>

                    {/* CTA */}
                    <div className="mt-4">
                      <span className="text-sm font-medium text-primary group-hover:underline">
                        Poglej podrobnosti →
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <CaseStudyModal
        caseStudy={selectedCase}
        isOpen={!!selectedCase}
        onClose={() => setSelectedCase(null)}
      />
    </>
  )
}
