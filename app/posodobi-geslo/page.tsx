'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function PosodobiGesloPage() {
  const router = useRouter()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrorMessage('')

    if (newPassword.length < 8) {
      setErrorMessage('Novo geslo mora imeti vsaj 8 znakov.')
      return
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Gesli se ne ujemata.')
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password: newPassword })

      if (error) {
        setErrorMessage('Povezava je neveljavna ali je potekla. Zahtevajte novo povezavo za ponastavitev gesla.')
        return
      }

      router.push('/prijava?reset=success')
    } catch {
      setErrorMessage('Prišlo je do napake. Poskusite znova.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md bg-card rounded-xl shadow-lg p-8 space-y-6">
        <div className="text-center mb-2">
          <h1 className="text-3xl font-bold text-primary font-display">LiftGO</h1>
        </div>

        <div className="space-y-2 text-center">
          <h2 className="text-2xl font-bold text-foreground">Posodobi geslo</h2>
          <p className="text-muted-foreground">Vnesite novo geslo za vaš račun.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-password">Novo geslo</Label>
            <Input id="new-password" type="password" placeholder="Vnesite novo geslo" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required disabled={loading} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Ponovi geslo</Label>
            <Input id="confirm-password" type="password" placeholder="Ponovno vnesite novo geslo" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required disabled={loading} />
          </div>

          {errorMessage && <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm">{errorMessage}</div>}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Shranjujem...' : 'Shrani novo geslo'}
          </Button>
        </form>
      </div>
    </div>
  )
}
