'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ObrtnikProfile } from '@/types/marketplace'

interface ProfilPageProps {
  profile: ObrtnikProfile
}

export default function ProfilPage({ profile }: ProfilPageProps) {
  const [ajpesId, setAjpesId] = useState(profile.ajpes_id || '')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleVerify = async () => {
    if (!ajpesId.trim()) {
      setError('Vnesite matično številko')
      return
    }

    setLoading(true)
    setMessage('')
    setError('')

    try {
      const response = await fetch('/api/agent/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ajpesId: ajpesId.trim(),
          businessName: profile.business_name,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Napaka pri verifikaciji')
      } else {
        setMessage(data.message)
      }
    } catch (err) {
      setError('Napaka pri povezavi s strežnikom')
      console.error('[v0] Verify error:', err)
    } finally {
      setLoading(false)
    }
  }

  const getVerificationBadge = () => {
    switch (profile.verification_status) {
      case 'verified':
        return <span className="text-green-600 font-semibold">✅ Verificiran obrtnik</span>
      case 'pending':
        return <span className="text-orange-600 font-semibold">⏳ Čaka na pregled</span>
      case 'rejected':
        return <span className="text-red-600 font-semibold">❌ Verifikacija zavrnjena</span>
      default:
        return <span className="text-gray-500">Ni verificiran</span>
    }
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-6">Podatki obrtnika</h2>

        <div className="space-y-4">
          {/* Business Name */}
          <div>
            <Label>Ime podjetja</Label>
            <p className="text-foreground font-medium">{profile.business_name}</p>
          </div>

          {/* Verification Status */}
          <div>
            <Label>Status verifikacije</Label>
            <div className="mt-2">{getVerificationBadge()}</div>
          </div>

          {/* AJPES ID Verification */}
          <div className="border-t pt-4 mt-4">
            <Label htmlFor="ajpes-id" className="block mb-2">
              Matična številka (AJPES)
            </Label>
            <div className="flex gap-2">
              <Input
                id="ajpes-id"
                type="text"
                placeholder="Npr. 1234567"
                value={ajpesId}
                onChange={(e) => setAjpesId(e.target.value)}
                disabled={loading}
                className="flex-1"
              />
              <Button
                onClick={handleVerify}
                disabled={loading}
                variant="default"
              >
                {loading ? 'Čakam...' : 'Preveri in verificiraj'}
              </Button>
            </div>

            {/* Messages */}
            {message && (
              <div className="mt-3 p-3 bg-blue-50 text-blue-800 rounded-md text-sm">
                {message}
              </div>
            )}
            {error && (
              <div className="mt-3 p-3 bg-red-50 text-red-800 rounded-md text-sm">
                {error}
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}
