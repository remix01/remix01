'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { Loader2 } from 'lucide-react'

interface MigratePartnerActionProps {
  partnerId: string
}

export function MigratePartnerAction({ partnerId }: MigratePartnerActionProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleMigrate = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/migrate-partner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partnerId })
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: 'Uspešno',
          description: `Partner je bil migiran v novi sistem`,
          variant: 'default'
        })
        window.location.reload()
      } else {
        toast({
          title: 'Napaka',
          description: data.error || 'Migracija je bila neuspešna',
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
      size="sm"
      variant="outline"
      onClick={handleMigrate}
      disabled={isLoading}
      className="gap-2"
    >
      {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
      {isLoading ? 'Migracija...' : 'Migriraj'}
    </Button>
  )
}
