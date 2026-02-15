"use client"

import { useEffect, useState } from "react"
import { X, Star, MapPin, Clock, Euro, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { type CaseStudy } from "@/lib/case-studies-data"

interface CaseStudyModalProps {
  caseStudy: CaseStudy | null
  isOpen: boolean
  onClose: () => void
}

export function CaseStudyModal({ caseStudy, isOpen, onClose }: CaseStudyModalProps) {
  const [sliderPosition, setSliderPosition] = useState(50)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    
    if (isOpen) {
      document.addEventListener("keydown", handleEsc)
      document.body.style.overflow = "hidden"
    }
    
    return () => {
      document.removeEventListener("keydown", handleEsc)
      document.body.style.overflow = "unset"
    }
  }, [isOpen, onClose])

  if (!isOpen || !caseStudy) return null

  const handleSliderMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width))
    const percent = (x / rect.width) * 100
    setSliderPosition(percent)
  }

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDragging) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = Math.max(0, Math.min(e.touches[0].clientX - rect.left, rect.width))
    const percent = (x / rect.width) * 100
    setSliderPosition(percent)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl border-2 bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-full bg-background/90 p-2 backdrop-blur-sm transition-colors hover:bg-background"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Content */}
        <div className="p-6 lg:p-10">
          {/* Header */}
          <div className="border-b pb-6">
            <Badge className="mb-3">{caseStudy.category}</Badge>
            <h2 className="font-display text-3xl font-bold text-foreground lg:text-4xl">
              {caseStudy.title}
            </h2>
            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>{caseStudy.location}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>{caseStudy.duration}</span>
              </div>
              <div className="flex items-center gap-2 font-medium text-primary">
                <Euro className="h-4 w-4" />
                <span>{caseStudy.price}</span>
              </div>
              <div className="flex items-center gap-1">
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
              </div>
            </div>
          </div>

          {/* Before/After Slider */}
          <div className="mt-8">
            <h3 className="mb-4 font-display text-xl font-bold text-foreground">
              Pred in Po
            </h3>
            <div
              className="relative aspect-[16/10] overflow-hidden rounded-xl bg-muted cursor-ew-resize"
              onMouseMove={handleSliderMove}
              onMouseDown={() => setIsDragging(true)}
              onMouseUp={() => setIsDragging(false)}
              onMouseLeave={() => setIsDragging(false)}
              onTouchMove={handleTouchMove}
              onTouchStart={() => setIsDragging(true)}
              onTouchEnd={() => setIsDragging(false)}
            >
              {/* After Image (Background) */}
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/30 to-accent/30">
                <div className="text-center">
                  <span className="font-display text-8xl font-bold text-primary/20">
                    PO
                  </span>
                </div>
              </div>

              {/* Before Image (Sliding overlay) */}
              <div
                className="absolute inset-0 flex items-center justify-center overflow-hidden bg-gradient-to-br from-muted to-muted-foreground/20"
                style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="font-display text-8xl font-bold text-muted-foreground/20">
                    PRED
                  </span>
                </div>
              </div>

              {/* Slider Line */}
              <div
                className="absolute top-0 bottom-0 w-1 bg-primary shadow-lg"
                style={{ left: `${sliderPosition}%` }}
              >
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary p-2 shadow-lg">
                  <ChevronLeft className="h-4 w-4 text-primary-foreground" />
                  <ChevronRight className="h-4 w-4 text-primary-foreground -ml-4" />
                </div>
              </div>

              {/* Labels */}
              <div className="absolute left-4 top-4 rounded-full bg-background/90 px-3 py-1 text-xs font-medium backdrop-blur-sm">
                PRED
              </div>
              <div className="absolute right-4 top-4 rounded-full bg-background/90 px-3 py-1 text-xs font-medium backdrop-blur-sm">
                PO
              </div>
            </div>
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Povlecite drsnik za primerjavo
            </p>
          </div>

          {/* Description */}
          <div className="mt-8">
            <h3 className="mb-3 font-display text-xl font-bold text-foreground">
              Opis projekta
            </h3>
            <p className="leading-relaxed text-muted-foreground">
              {caseStudy.description}
            </p>
          </div>

          {/* Challenges */}
          <div className="mt-8">
            <h3 className="mb-3 font-display text-xl font-bold text-foreground">
              Izzivi
            </h3>
            <ul className="space-y-2">
              {caseStudy.challenges.map((challenge, index) => (
                <li key={index} className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="leading-relaxed text-muted-foreground">
                    {challenge}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Solution */}
          <div className="mt-8">
            <h3 className="mb-3 font-display text-xl font-bold text-foreground">
              Rešitev
            </h3>
            <p className="leading-relaxed text-muted-foreground">
              {caseStudy.solution}
            </p>
          </div>

          {/* Price Breakdown */}
          <div className="mt-8">
            <h3 className="mb-3 font-display text-xl font-bold text-foreground">
              Razčlenitev cene
            </h3>
            <div className="space-y-3 rounded-xl bg-muted p-6">
              {caseStudy.priceBreakdown.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-medium text-foreground">{item.amount}</span>
                </div>
              ))}
              <div className="flex items-center justify-between border-t pt-3">
                <span className="font-display text-lg font-bold text-foreground">
                  Skupaj
                </span>
                <span className="font-display text-2xl font-bold text-primary">
                  {caseStudy.price}
                </span>
              </div>
            </div>
          </div>

          {/* Craftsman Profile */}
          <div className="mt-8">
            <h3 className="mb-4 font-display text-xl font-bold text-foreground">
              Mojster ki je izvedel delo
            </h3>
            <div className="flex items-center gap-4 rounded-xl border bg-card p-6">
              <Avatar className="h-16 w-16 border-2 border-primary/20">
                <AvatarImage src={caseStudy.craftsman.avatar} />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold text-lg">
                  {caseStudy.craftsman.name.split(" ").map(n => n[0]).join("")}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h4 className="font-display text-lg font-bold text-foreground">
                  {caseStudy.craftsman.name}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {caseStudy.craftsman.specialty}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {caseStudy.craftsman.experience} izkušenj
                </p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-8 rounded-xl bg-primary/5 p-6 text-center">
            <h3 className="font-display text-xl font-bold text-foreground">
              Potrebujete podobno delo?
            </h3>
            <p className="mt-2 text-muted-foreground">
              Oddajte brezplačno povpraševanje in prejmite ponudbe preverjenihobrtnikov.
            </p>
            <Button size="lg" className="mt-4 gap-2" asChild>
              <a href="/#oddaj-povprasevanje">
                Najdi podobnega mojstra
              </a>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
