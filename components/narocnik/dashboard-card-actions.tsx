'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  cancelPovprasevanjeAction,
  deletePovprasevanjeAction,
} from '@/app/actions/povprasevanja'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, XCircle, Trash2 } from 'lucide-react'

interface DashboardCardActionsProps {
  povprasevanjeId: string
  status: string
  hasPonudbe: boolean
}

export function DashboardCardActions({
  povprasevanjeId,
  status,
  hasPonudbe,
}: DashboardCardActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isFinal = ['v_izvedbi', 'v_teku', 'zakljuceno', 'preklicano', 'completed', 'cancelled'].includes(status)
  const canCancel = !isFinal && status !== 'v_izvedbi' && status !== 'v_teku'
  const canDelete = !hasPonudbe && !isFinal

  if (!canCancel && !canDelete) return null

  async function handleCancel() {
    if (!confirm('Ste prepričani, da želite preklicati to povpraševanje?')) return
    setLoading(true)
    setError(null)
    const result = await cancelPovprasevanjeAction(povprasevanjeId)
    setLoading(false)
    if (result.success) {
      router.refresh()
    } else {
      setError(result.error || 'Napaka')
    }
  }

  async function handleDelete() {
    if (!confirm('Ste prepričani, da želite izbrisati to povpraševanje?')) return
    setLoading(true)
    setError(null)
    const result = await deletePovprasevanjeAction(povprasevanjeId)
    setLoading(false)
    if (result.success) {
      router.refresh()
    } else {
      setError(result.error || 'Napaka')
    }
  }

  return (
    <>
      {error && (
        <span className="text-xs text-red-600">{error}</span>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" disabled={loading} className="h-8 w-8 p-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {canCancel && (
            <DropdownMenuItem onClick={handleCancel} className="text-amber-700">
              <XCircle className="mr-2 h-4 w-4" />
              Prekliči povpraševanje
            </DropdownMenuItem>
          )}
          {canDelete && (
            <DropdownMenuItem onClick={handleDelete} className="text-red-700">
              <Trash2 className="mr-2 h-4 w-4" />
              Izbriši povpraševanje
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}
