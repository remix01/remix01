'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function PozabljenoGesloPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const supabase = createClient()
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/nastavi-geslo`,
      })

      if (resetError) {
        setError('Napaka pri pošiljanju. Preverite email naslov in poskusite znova.')
        return
      }

      setSent(true)
    } catch {
      setError('Napaka. Poskusite znova.')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="space-y-4 text-center">
        <h2 className="text-2xl font-bold text-foreground">Preverite email</h2>
        <p className="text-muted-foreground">
          Poslali smo vam povezavo za ponastavitev gesla na <strong>{email}</strong>.
        </p>
        <p className="text-sm text-muted-foreground">
          Če emaila ne vidite, preverite mapo z neželeno pošto.
        </p>
        <Link href="/prijava" className="block text-primary hover:underline text-sm">
          ← Nazaj na prijavo
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-bold text-foreground">Pozabljeno geslo</h2>
        <p className="text-muted-foreground">Vnesite vaš email in poslali vam bomo povezavo za ponastavitev.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="vam@primer.si"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
          />
        </div>

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm">
            {error}
          </div>
        )}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Pošiljam...' : 'Pošlji povezavo'}
        </Button>
      </form>

      <div className="text-center text-sm">
        <Link href="/prijava" className="text-primary hover:underline">
          ← Nazaj na prijavo
        </Link>
      </div>
    </div>
  )
}
