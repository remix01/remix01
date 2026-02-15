"use client"

import { Shield, Check, AlertTriangle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface FirstContactModalProps {
  isOpen: boolean
  onClose: () => void
}

export function FirstContactModal({ isOpen, onClose }: FirstContactModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-primary/10 p-4">
              <Shield className="h-10 w-10 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-center text-2xl">
            Ostanite zaščiteni z LiftGO
          </DialogTitle>
          <DialogDescription className="sr-only">
            Varnostna opozorila za uporabo platforme
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Benefits */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-green-100 p-1 dark:bg-green-900/30">
                <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <p className="text-sm text-foreground leading-relaxed">
                Vaše plačilo je zaklenjeno — sproščeno šele ko potrdite delo
              </p>
            </div>

            <div className="flex items-start gap-3">
              <div className="rounded-full bg-green-100 p-1 dark:bg-green-900/30">
                <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <p className="text-sm text-foreground leading-relaxed">
                2-urna garancija odziva velja samo prek platforme
              </p>
            </div>

            <div className="flex items-start gap-3">
              <div className="rounded-full bg-green-100 p-1 dark:bg-green-900/30">
                <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <p className="text-sm text-foreground leading-relaxed">
                Ocene in reference mojstra so preverljive
              </p>
            </div>

            <div className="flex items-start gap-3">
              <div className="rounded-full bg-green-100 p-1 dark:bg-green-900/30">
                <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <p className="text-sm text-foreground leading-relaxed">
                Spori rešeni brez stroškov prek LiftGO
              </p>
            </div>
          </div>

          {/* Warning */}
          <div className="rounded-lg border-2 border-destructive bg-destructive/10 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-destructive">
                  Dogovor zunaj platforme = izguba vseh zaščit in možni izbris računa
                </p>
              </div>
            </div>
          </div>

          {/* Terms reference */}
          <p className="text-xs text-center text-muted-foreground">
            Pogoji uporabe LiftGO, člen 4.2
          </p>
        </div>

        <Button onClick={onClose} className="w-full" size="lg">
          Razumem, komuniciram varno
        </Button>
      </DialogContent>
    </Dialog>
  )
}
