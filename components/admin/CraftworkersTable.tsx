'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { Eye, Ban, CheckCircle, MessageSquare } from 'lucide-react'

type FilterStatus = 'all' | 'active' | 'suspended' | 'unverified'

interface Craftworker {
  id: string
  name: string
  email: string
  packageType: 'START' | 'PRO'
  stripeOnboardingComplete: boolean
  totalJobsCompleted: number
  avgRating: number
  bypassWarnings: number
  isSuspended: boolean
  isVerified: boolean
  violationCount: number
}

export function CraftworkersTable() {
  const [craftworkers, setCraftworkers] = useState<Craftworker[]>([])
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCraftworkers()
  }, [filter])

  const fetchCraftworkers = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/craftworkers?filter=${filter}`)
      const data = await response.json()
      setCraftworkers(data)
    } catch (error) {
      console.error('[v0] Failed to fetch craftworkers:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSuspend = async (id: string) => {
    if (!confirm('Ali ste prepričani, da želite suspendirati tega obrtnika?')) return
    
    try {
      await fetch(`/api/admin/craftworkers/${id}/suspend`, { method: 'POST' })
      fetchCraftworkers()
    } catch (error) {
      console.error('[v0] Failed to suspend craftworker:', error)
    }
  }

  const handleUnsuspend = async (id: string) => {
    try {
      await fetch(`/api/admin/craftworkers/${id}/unsuspend`, { method: 'POST' })
      fetchCraftworkers()
    } catch (error) {
      console.error('[v0] Failed to unsuspend craftworker:', error)
    }
  }

  if (loading) {
    return <div className="py-8 text-center text-muted-foreground">Nalaganje...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Select value={filter} onValueChange={(value) => setFilter(value as FilterStatus)}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Vsi</SelectItem>
            <SelectItem value="active">Aktivni</SelectItem>
            <SelectItem value="suspended">Suspendirani</SelectItem>
            <SelectItem value="unverified">Neverificirani</SelectItem>
          </SelectContent>
        </Select>

        <div className="text-sm text-muted-foreground">
          Skupaj: {craftworkers.length}
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left text-sm font-medium">Ime</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Paket</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Stripe</th>
                <th className="px-4 py-3 text-center text-sm font-medium">Dela</th>
                <th className="px-4 py-3 text-center text-sm font-medium">Ocena</th>
                <th className="px-4 py-3 text-center text-sm font-medium">Kršitve</th>
                <th className="px-4 py-3 text-center text-sm font-medium">Opozorila</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                <th className="px-4 py-3 text-right text-sm font-medium">Akcije</th>
              </tr>
            </thead>
            <tbody>
              {craftworkers.map((cw) => (
                <tr key={cw.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-medium">{cw.name}</div>
                      <div className="text-xs text-muted-foreground">{cw.email}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={cw.packageType === 'PRO' ? 'default' : 'secondary'}>
                      {cw.packageType}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {cw.stripeOnboardingComplete ? (
                      <Badge variant="default" className="bg-green-500">
                        Povezan
                      </Badge>
                    ) : (
                      <Badge variant="destructive">Ni povezan</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">{cw.totalJobsCompleted}</td>
                  <td className="px-4 py-3 text-center">
                    {cw.avgRating > 0 ? cw.avgRating.toFixed(1) : '-'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {cw.violationCount > 0 ? (
                      <Badge variant="destructive">{cw.violationCount}</Badge>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {cw.bypassWarnings > 0 ? (
                      <Badge variant="destructive">{cw.bypassWarnings}</Badge>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {cw.isSuspended ? (
                      <Badge variant="destructive">Suspendiran</Badge>
                    ) : cw.isVerified ? (
                      <Badge variant="default" className="bg-green-500">Aktiven</Badge>
                    ) : (
                      <Badge variant="secondary">Neverificiran</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/admin/craftworkers/${cw.id}`}>
                        <Button size="sm" variant="ghost">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      {cw.isSuspended ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleUnsuspend(cw.id)}
                        >
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleSuspend(cw.id)}
                        >
                          <Ban className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
