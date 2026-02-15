'use client'

import { useState } from 'react'
import { AlertTriangle, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import Link from 'next/link'

interface TermsAcceptanceProps {
  onAccept: () => void
  isLoading?: boolean
}

export default function TermsAcceptance({ onAccept, isLoading = false }: TermsAcceptanceProps) {
  const [termsChecked, setTermsChecked] = useState(false)
  const [bypassChecked, setBypassChecked] = useState(false)
  const [consequencesChecked, setConsequencesChecked] = useState(false)

  const allChecked = termsChecked && bypassChecked && consequencesChecked

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground">Pogoji uporabe</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Pred nadaljevanjem preberite in sprejmite pogoje uporabe
        </p>
      </div>

      {/* Scrollable Terms Content */}
      <div className="rounded-lg border bg-card">
        <ScrollArea className="h-[300px] p-6">
          <div className="space-y-4 text-sm">
            <div>
              <h3 className="font-semibold text-foreground mb-2">§2 Provizija in plačila</h3>
              <p className="text-muted-foreground">
                Paket START: 10% provizija • Paket PRO: 5% provizija
              </p>
            </div>

            <div className="rounded-lg border-2 border-red-500/50 bg-red-500/10 p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-foreground">
                    §3 PREPOVED DIREKTNEGA DOGOVARJANJA
                  </h3>
                  <p className="text-muted-foreground mt-2">
                    Kontaktiranje stranke zunaj platforme LiftGO pred ali po prvem stiku, 
                    za namen izogibanja plačilu provizije, je <strong>strogo prepovedano</strong>.
                  </p>
                  
                  <div className="mt-3 space-y-2 text-sm">
                    <p className="font-semibold text-foreground">Sankcije:</p>
                    <ul className="list-disc ml-5 space-y-1 text-muted-foreground">
                      <li>1. kršitev: Pisni opomin</li>
                      <li>2. kršitev: Začasna suspenzija (7 dni)</li>
                      <li>3. kršitev: <span className="text-red-600 dark:text-red-400 font-semibold">Trajna izključitev</span></li>
                    </ul>
                  </div>

                  <p className="mt-3 text-sm text-red-600 dark:text-red-400 font-semibold">
                    §3.2 Ob trajni izključitvi obrtnik izgubi vse ocene, reference in 
                    zgodovino del na platformi.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-2">§4 Garancija odziva in zavarovanje</h3>
              <p className="text-muted-foreground">
                Garancija odziva v 2 urah in zavarovanje odgovornosti veljata samo za 
                posle prek platforme.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-2">§5 Zasebnost in komunikacija</h3>
              <p className="text-muted-foreground">
                Vsa komunikacija poteka prek varnega sistema sporočil LiftGO. Sistem 
                avtomatsko zazna in blokira deljenje kontaktnih podatkov.
              </p>
            </div>

            <div className="pt-4 border-t">
              <Link 
                href="/terms/craftworker" 
                target="_blank"
                className="inline-flex items-center gap-1 text-primary hover:underline text-sm"
              >
                Preberite celotne pogoje uporabe
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Checkboxes */}
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
          <Checkbox
            id="terms"
            checked={termsChecked}
            onCheckedChange={(checked) => setTermsChecked(checked === true)}
            className="mt-0.5"
          />
          <Label htmlFor="terms" className="text-sm leading-relaxed cursor-pointer font-normal">
            Prebral/a sem in se strinjam s{' '}
            <Link href="/terms/craftworker" target="_blank" className="underline text-primary">
              Pogoji uporabe
            </Link>{' '}
            (verzija 2026-02-v1)
          </Label>
        </div>

        <div className="flex items-start gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
          <Checkbox
            id="bypass"
            checked={bypassChecked}
            onCheckedChange={(checked) => setBypassChecked(checked === true)}
            className="mt-0.5"
          />
          <Label htmlFor="bypass" className="text-sm leading-relaxed cursor-pointer font-normal">
            <strong className="text-foreground">
              Razumem, da je direktno dogovarjanje mimo platforme kršitev (§3)
            </strong>
            {' '}in da sistem avtomatsko zazna deljenje kontaktnih podatkov
          </Label>
        </div>

        <div className="flex items-start gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
          <Checkbox
            id="consequences"
            checked={consequencesChecked}
            onCheckedChange={(checked) => setConsequencesChecked(checked === true)}
            className="mt-0.5"
          />
          <Label htmlFor="consequences" className="text-sm leading-relaxed cursor-pointer font-normal">
            <strong className="text-foreground">
              Strinjam se, da kršitev lahko vodi do izgube računa in vseh referenc (§3.2)
            </strong>
            {' '}ter da ni možnosti ponovne registracije po trajni izključitvi
          </Label>
        </div>
      </div>

      {/* Submit Button */}
      <Button 
        onClick={onAccept}
        disabled={!allChecked || isLoading}
        className="w-full"
        size="lg"
      >
        {isLoading ? 'Potrjujem...' : 'Sprejmi pogoje in nadaljuj'}
      </Button>

      {!allChecked && (
        <p className="text-xs text-center text-muted-foreground">
          Za nadaljevanje morate potrditi vse tri pogoje
        </p>
      )}
    </div>
  )
}
