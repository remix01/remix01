'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { manuallyVerifyObrtnik } from '@/lib/mcp/ajpes'

interface VerificationActionsProps {
  verificationId: string
  obrtknikId: string
}

export function VerificationActions({
  verificationId,
  obrtknikId,
}: VerificationActionsProps) {
  const [loading, setLoading] = useState(false)

  const handleApprove = async () => {
    setLoading(true)
    try {
      const result = await manuallyVerifyObrtnik({
        obrtknikId,
        adminId: 'admin-id-placeholder', // Will be set by server action
        approved: true,
        notes: 'Odobril administrator',
      })

      if (result.success) {
        window.location.reload()
      }
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async () => {
    setLoading(true)
    try {
      const result = await manuallyVerifyObrtnik({
        obrtknikId,
        adminId: 'admin-id-placeholder', // Will be set by server action
        approved: false,
        notes: 'Zavrnul administrator',
      })

      if (result.success) {
        window.location.reload()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button
        onClick={handleApprove}
        disabled={loading}
        variant="default"
        className="bg-green-600 hover:bg-green-700"
      >
        ✓ Odobri
      </Button>
      <Button
        onClick={handleReject}
        disabled={loading}
        variant="outline"
        className="border-red-600 text-red-600 hover:bg-red-50"
      >
        ✕ Zavrni
      </Button>
    </>
  )
}
