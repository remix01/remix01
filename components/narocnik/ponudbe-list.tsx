'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Ponudba, PovprasevanjeStatus } from '@/types/marketplace'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { acceptPonudbaAction } from '@/app/actions/ponudbe'

interface PonudbeListProps {
  ponudbe: Ponudba[]
  povprasevanjeId: string
  povprasevanjeStatus: PovprasevanjeStatus
}

export default function PonudbeList({
  ponudbe,
  povprasevanjeId,
  povprasevanjeStatus,
}: PonudbeListProps) {
  const router = useRouter()
  const [acceptingId, setAcceptingId] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  if (ponudbe.length === 0) {
    return (
      <Card className="border-blue-200 bg-blue-50 p-6">
        <p className="text-center text-blue-900">
          <strong>Čakamo na ponudbe mojstrov.</strong>
          <br />
          Obrtniki bodo odgovorili v manj kot 2 urah.
        </p>
      </Card>
    )
  }

  async function handleAcceptPonudba(ponudbaId: string) {
    setAcceptingId(ponudbaId)
    setErrorMessage(null)

    try {
      const result = await acceptPonudbaAction(ponudbaId, povprasevanjeId)
      
      if (result.success) {
        setSuccessMessage('Ponudba sprejeta!')
        setTimeout(() => {
          router.refresh()
        }, 1000)
      } else {
        setErrorMessage(result.error || 'Napaka pri sprejemu ponudbe')
      }
    } catch (err) {
      setErrorMessage('Napaka pri sprejemu ponudbe. Poskusite znova.')
    } finally {
      setAcceptingId(null)
    }
  }

  const acceptedPonudba = ponudbe.find((p) => p.status === 'sprejeta')

  const priceLabels: Record<string, string> = {
    'fiksna': 'Fiksna cena',
    'ocena': 'Ocena',
    'po_ogledu': 'Cena po ogledu',
  }

  return (
    <div className="space-y-4">
      {successMessage && (
        <div className="rounded-lg bg-green-100 p-4 text-green-900">
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="rounded-lg bg-red-100 p-4 text-red-900">
          {errorMessage}
        </div>
      )}

      {ponudbe.map((ponudba) => {
        const obrtnik = ponudba.obrtnik
        const profile = obrtnik?.profile
        const businessName = obrtnik?.business_name || 'Obrtnik'
        const initials = businessName
          .split(' ')
          .map((word) => word[0])
          .join('')
          .toUpperCase()

        const isAccepted = ponudba.status === 'sprejeta'

        return (
          <Card
            key={ponudba.id}
            className={`border-2 p-6 ${
              isAccepted
                ? 'border-green-500 bg-green-50'
                : 'border-gray-200'
            }`}
          >
            <div className="mb-4 flex items-start gap-4">
              {/* Avatar */}
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-600 text-white font-bold">
                {initials}
              </div>

              {/* Business Info */}
              <div className="flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <strong className="text-gray-900">{businessName}</strong>
                  {obrtnik?.avg_rating && obrtnik.avg_rating > 0 && (
                    <span className="text-sm text-yellow-600">
                      {'★'.repeat(Math.round(obrtnik.avg_rating))}
                    </span>
                  )}
                </div>
                {isAccepted && (
                  <Badge className="mb-2 bg-green-600 text-white">
                    Sprejeto
                  </Badge>
                )}
              </div>
            </div>

            {/* Message */}
            <p className="mb-4 whitespace-pre-wrap text-gray-700">
              {ponudba.message}
            </p>

            {/* Price */}
            <div className="mb-3 text-sm text-gray-700">
              <strong>
                {priceLabels[ponudba.price_type]}
                {ponudba.price_type !== 'po_ogledu' && ponudba.price_estimate
                  ? `: ${ponudba.price_estimate} EUR`
                  : ''}
              </strong>
            </div>

            {/* Available Date */}
            {ponudba.available_date && (
              <div className="mb-4 text-sm text-gray-700">
                Na voljo od:{' '}
                {new Date(ponudba.available_date).toLocaleDateString('sl-SI')}
              </div>
            )}

            {/* Accept Button */}
            {povprasevanjeStatus === 'odprto' && !isAccepted && (
              <Button
                onClick={() => handleAcceptPonudba(ponudba.id)}
                disabled={acceptingId === ponudba.id}
                className="bg-teal-600 hover:bg-teal-700"
              >
                {acceptingId === ponudba.id ? 'Sprejmem...' : 'Sprejmi ponudbo'}
              </Button>
            )}
          </Card>
        )
      })}
    </div>
  )
}
