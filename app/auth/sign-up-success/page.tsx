import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">
                Hvala, da ste se registrirali!
              </CardTitle>
              <CardDescription>Preverite svoj email za potrditev</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Uspešno ste se registrirali. Prosim, preverite svoj email, da potrdite svoj račun, preden se prijavite.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
