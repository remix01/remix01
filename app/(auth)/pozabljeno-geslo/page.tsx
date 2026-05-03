'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function PozabljenoGesloPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSuccessMessage('')
    setErrorMessage('')
    setLoading(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/posodobi-geslo`,
      })

      if (error) {
        setErrorMessage('Prišlo je do napake. Poskusite znova čez nekaj trenutkov.')
        return
      }

      setSuccessMessage('Če račun s tem emailom obstaja, smo nanj poslali povezavo za ponastavitev gesla.')
    } catch {
      setErrorMessage('Prišlo je do napake. Poskusite znova čez nekaj trenutkov.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-bold text-foreground">Pozabljeno geslo</h2>
        <p className="text-muted-foreground">Vnesite email in poslali vam bomo povezavo za ponastavitev.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="vam@primer.si" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={loading} />
        </div>

        {successMessage && <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-md text-emerald-700 text-sm">{successMessage}</div>}
        {errorMessage && <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm">{errorMessage}</div>}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Pošiljam...' : 'Pošlji povezavo za reset gesla'}
        </Button>
      </form>

      <div className="text-center">
        <Link href="/prijava" className="text-sm text-muted-foreground hover:underline">Nazaj na prijavo</Link>
      </div>
    </div>
  )
}
