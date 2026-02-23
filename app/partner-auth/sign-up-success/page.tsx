'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { CheckCircle } from 'lucide-react'

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader className="space-y-4 text-center">
              <div className="flex justify-center">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
              <CardTitle className="text-2xl">
                Registracija uspešna!
              </CardTitle>
              <CardDescription>
                Preverite svoj email in potrdite račun
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Uspešno ste se registrirali kot partner. Prosim, preverite svoj email, da potrdite svoj račun, preden se prijavite.
              </p>

              <Link href="/partner-auth/login" className="block">
                <Button className="w-full">
                  Prijava za partnerje →
                </Button>
              </Link>

              <div className="border-t pt-4 text-center">
                <p className="text-xs text-muted-foreground">
                  Imate vprašanja?{' '}
                  <a href="mailto:info@liftgo.net" className="text-blue-600 hover:underline font-medium">
                    info@liftgo.net
                  </a>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
