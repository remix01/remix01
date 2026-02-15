"use client"

import { useEffect } from 'react'
import { toast } from 'sonner'
import { AlertTriangle, Shield } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface BlockedMessageBannerProps {
  count: number
}

export function BlockedMessageBanner({ count }: BlockedMessageBannerProps) {
  useEffect(() => {
    if (count === 1 || count === 2) {
      // Show amber toast notification
      toast.warning('Sporočilo blokirano', {
        description: 'Kontaktnih podatkov ne smete deliti pred potrjenim plačilom.',
        duration: 5000,
        icon: <Shield className="h-4 w-4" />,
      })
    }
  }, [count])

  if (count < 3) return null

  return (
    <AlertDialog open={count >= 3}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-destructive/10 p-4">
              <AlertTriangle className="h-10 w-10 text-destructive" />
            </div>
          </div>
          <AlertDialogTitle className="text-center text-xl">
            Opozorilo: Možna suspenzija računa
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center space-y-3">
            <p>
              Vaša sporočila so bila blokirana <strong>{count}×</strong> zaradi poskusov deljenja kontaktnih podatkov.
            </p>
            <p className="text-destructive font-medium">
              Nadaljnje kršitve lahko vodijo do trajne suspenzije vašega računa.
            </p>
            <div className="bg-muted rounded-lg p-4 text-left text-sm">
              <p className="font-semibold mb-2">Zakaj ne morete deliti kontaktov:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Vaše plačilo ostane nezaščiteno</li>
                <li>Garancije LiftGO ne veljajo</li>
                <li>Kršite pogoje uporabe platforme</li>
                <li>Spore ni mogoče reševati</li>
              </ul>
            </div>
            <p className="text-sm">
              Po potrditvi in plačilu dela boste lahko delili kontaktne podatke za prihodnja dela.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction className="w-full">
            Razumem in bom upošteval pravila
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
