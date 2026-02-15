"use client"

import { useState, useEffect } from "react"
import { Star, MapPin, Clock, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

export function OfferPreview() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 300)
    return () => clearTimeout(timer)
  }, [])

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-background to-secondary/20 py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">
            Preglednost najprej
          </p>
          <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-foreground text-balance md:text-4xl lg:text-5xl">
            Takole izgleda, ko prejmete ponudbo
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Vidite ceno preden se odločite. Brez presenečenj na koncu.
          </p>
        </div>

        <div className="mt-16 flex justify-center">
          <div
            className={`relative transition-all duration-700 ${
              isVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
            }`}
          >
            {/* Phone Frame */}
            <div className="relative mx-auto w-[340px] rounded-[2.5rem] border-[14px] border-foreground bg-foreground p-3 shadow-2xl">
              <div className="absolute left-1/2 top-0 h-6 w-32 -translate-x-1/2 rounded-b-3xl bg-foreground" />
              
              {/* Screen Content */}
              <div className="overflow-hidden rounded-[1.75rem] bg-background">
                <div className="p-6">
                  {/* Header */}
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-muted-foreground">
                      Vaša ponudba
                    </h3>
                    <Badge variant="secondary" className="bg-primary/10 text-primary">
                      Nova
                    </Badge>
                  </div>

                  {/* Offer Card */}
                  <div className="rounded-2xl border bg-card p-5 shadow-sm">
                    {/* Craftsman Info */}
                    <div className="flex items-start gap-4">
                      <Avatar className="h-16 w-16 border-2 border-primary/20">
                        <AvatarImage src="/placeholder.svg" alt="Mojster" />
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          MN
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1">
                        <h4 className="font-display text-lg font-bold text-foreground">
                          Marko Novak
                        </h4>
                        <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          <span>12 let izkušenj</span>
                        </div>
                        <div className="mt-1 flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className="h-4 w-4 fill-accent text-accent"
                            />
                          ))}
                          <span className="ml-1 text-sm font-medium text-foreground">
                            5.0
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Specialties */}
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Badge variant="secondary" className="text-xs">
                        Vodoinstalacije
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        Kopalnice
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        Zamenjave
                      </Badge>
                    </div>

                    {/* Location */}
                    <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>Ljubljana in okolica</span>
                    </div>

                    {/* Price Highlight */}
                    <div className="mt-5 rounded-xl bg-primary/5 p-4">
                      <div className="flex items-baseline justify-between">
                        <span className="text-sm text-muted-foreground">
                          Ocenjena cena
                        </span>
                        <div className="text-right">
                          <span className="font-display text-2xl font-bold text-primary">
                            45€
                          </span>
                          <span className="text-sm text-muted-foreground">/uro</span>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                        <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                        <span>Brez skritih stroškov</span>
                      </div>
                    </div>

                    {/* CTA Button */}
                    <Button className="mt-5 w-full gap-2" size="lg">
                      Kontaktiraj mojstra
                    </Button>
                  </div>

                  {/* Footer Note */}
                  <p className="mt-4 text-center text-xs text-muted-foreground">
                    Vidite vse podrobnosti preden se odločite
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Note */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
            <CheckCircle2 className="h-4 w-4" />
            <span>Transparentne cene. Brez presenečenj.</span>
          </div>
        </div>
      </div>
    </section>
  )
}
