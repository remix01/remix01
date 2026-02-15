'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export default function AntiBypassAgreementModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    // Check if modal should be shown
    const lastShown = localStorage.getItem('antiBypassModalLastShown')
    const now = Date.now()
    const ninetyDaysInMs = 90 * 24 * 60 * 60 * 1000

    if (!lastShown || now - parseInt(lastShown) > ninetyDaysInMs) {
      // Check if user is craftworker and hasn't accepted recent terms
      checkIfShouldShow()
    }
  }, [])

  const checkIfShouldShow = async () => {
    try {
      const response = await fetch('/api/auth/check-terms-acceptance')
      const data = await response.json()
      
      if (data.shouldShowModal) {
        setIsOpen(true)
      }
    } catch (error) {
      console.error('[AntiBypassModal] Error checking terms:', error)
    }
  }

  const handleConfirm = async () => {
    setIsLoading(true)
    
    try {
      const response = await fetch('/api/auth/accept-terms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tosVersion: '2026-02-v1',
          craftworkerAgreement: true,
        }),
      })

      if (response.ok) {
        // Store in localStorage to prevent showing again for 90 days
        localStorage.setItem('antiBypassModalLastShown', Date.now().toString())
        setIsOpen(false)
      } else {
        throw new Error('Failed to accept terms')
      }
    } catch (error) {
      console.error('[AntiBypassModal] Error accepting terms:', error)
      alert('Prišlo je do napake. Poskusite znova.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={() => {/* Prevent closing */}}>
      <DialogContent 
        className="sm:max-w-[600px]"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
              <AlertTriangle className="h-6 w-6 text-red-500" />
            </div>
            <div>
              <DialogTitle className="text-xl">Posodobljeni pogoji uporabe</DialogTitle>
              <DialogDescription>
                Pomembna obvestila o anti-bypass pravilih
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg bg-muted/50 p-4 space-y-3">
            <h3 className="font-semibold text-foreground">Kaj se je spremenilo?</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Posodobili smo pogoje uporabe z jasnejšimi pravili o komunikaciji s strankami in 
              sankcijah za direktno dogovarjanje mimo platforme.
            </p>
          </div>

          <div className="rounded-lg border-2 border-red-500/50 bg-red-500/10 p-4 space-y-3">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Ključna pravila (§3):
            </h3>
            <ul className="text-sm text-muted-foreground space-y-2 ml-6 list-disc">
              <li>
                <strong className="text-foreground">Prepovedano je kontaktiranje strank zunaj platforme</strong> pred 
                prvim plačilom za namen izogibanja proviziji
              </li>
              <li>
                <strong className="text-foreground">Avtomatsko zaznavanje:</strong> Sistem zazna deljenje 
                telefonskih številk, e-pošte in sporočilnih aplikacij
              </li>
              <li>
                <strong className="text-foreground">Sankcije:</strong> 3 kršitve = trajna izključitev + 
                izguba vseh ocen in referenc
              </li>
            </ul>
          </div>

          <div className="rounded-lg bg-primary/10 p-4">
            <h3 className="font-semibold text-foreground mb-2">Zakaj ta pravila?</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Platforma zagotavlja zaupanje, zaščito plačil, zavarovanje in verifikacijo. Provizija 
              je plačilo za te storitve. Direktno dogovarjanje ogroža zaupanje strank in poštenost 
              do drugih obrtnikov, ki spoštujejo pravila.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-4">
          <Button 
            onClick={handleConfirm}
            disabled={isLoading}
            size="lg"
            className="w-full"
          >
            {isLoading ? 'Potrjujem...' : 'Potrjujem in nadaljujem'}
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            S potrditvijo se strinjate z{' '}
            <a href="/terms/craftworker" target="_blank" rel="noopener noreferrer" className="underline">
              posodobljenimi pogoji uporabe
            </a>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
