'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AlertCircle } from 'lucide-react'

interface AvailabilityToggleProps {
  initialStatus: boolean
  obrtnikId: string
}

export function AvailabilityToggle({ initialStatus, obrtnikId }: AvailabilityToggleProps) {
  const [isAvailable, setIsAvailable] = useState(initialStatus)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  const handleToggle = async () => {
    setLoading(true)
    setError('')

    try {
      const { error: updateError } = await supabase
        .from('obrtnik_profiles')
        .update({ is_available: !isAvailable })
        .eq('id', obrtnikId)

      if (updateError) throw updateError
      setIsAvailable(!isAvailable)
    } catch (err: any) {
      setError(err.message)
      setTimeout(() => setError(''), 3000)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      {error && (
        <div className="text-xs text-red-600 flex items-center gap-1">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}
      <button
        onClick={handleToggle}
        disabled={loading}
        className={`px-4 py-2 rounded-lg font-medium text-sm transition flex items-center gap-2 ${
          isAvailable
            ? 'bg-green-100 text-green-800 hover:bg-green-200'
            : 'bg-red-100 text-red-800 hover:bg-red-200'
        }`}
      >
        <span className={`w-2 h-2 rounded-full ${isAvailable ? 'bg-green-600' : 'bg-red-600'}`} />
        {isAvailable ? 'Na voljo' : 'Zaseden'}
      </button>
    </div>
  )
}
