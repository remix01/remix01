'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { Loader2 } from 'lucide-react'

interface MigrateAllPartnersActionProps {
  totalNonMigrated: number
}

export function MigrateAllPartnersAction({ totalNonMigrated }: MigrateAllPartnersActionProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleMigrateAll = async () => {
    if (!confirm(`Ali ste prepričani? Migrirate bo ${totalNonMigrated} partnerjev naenkrat.`)) {
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/migrate-all-partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: 'Uspešno',
          description: `${data.successful} od ${data.total} partnerjev je bilo uspešno migrirano${
            data.failed > 0 ? `, ${data.failed} je bilo neuspešnih` : ''
          }`,
          variant: data.failed === 0 ? 'default' : 'destructive'
        })
        window.location.reload()
      } else {
        toast({
          title: 'Napaka',
          description: data.error || 'Množična migracija je bila neuspešna',
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'Napaka',
        description: error instanceof Error ? error.message : 'Prišlo je do napake',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      size="lg"
      onClick={handleMigrateAll}
      disabled={isLoading}
      className="gap-2 w-full"
    >
      {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
      {isLoading ? `Migracija v teku (${totalNonMigrated} partnerjev)...` : `Migriraj vse ${totalNonMigrated} partnerjev`}
    </Button>
  )
}
