'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Eye, EyeOff, AlertCircle, UserX } from 'lucide-react'

type Violation = {
  id: string
  type: string
  severity: string
  createdAt: string
  isReviewed: boolean
  detectedContent: string
  job: {
    id: string
    title: string
    status: string
  }
  user: {
    id: string
    name: string
    email: string
    craftworkerProfile: {
      bypassWarnings: number
      isSuspended: boolean
    } | null
  }
}

const severityColors = {
  LOW: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
  MEDIUM: 'bg-orange-500/10 text-orange-700 dark:text-orange-400',
  HIGH: 'bg-red-500/10 text-red-700 dark:text-red-400',
  CRITICAL: 'bg-red-600/20 text-red-900 dark:text-red-300 font-bold',
}

const typeLabels: Record<string, string> = {
  PHONE_DETECTED: 'Phone #',
  EMAIL_DETECTED: 'Email',
  BYPASS_ATTEMPT: 'Bypass',
  SUSPICIOUS_PATTERN: 'Suspicious'
}

export function ViolationsTable() {
  const [violations, setViolations] = useState<Violation[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    type: 'all',
    severity: 'all',
    reviewed: 'all'
  })
  const [revealedContent, setRevealedContent] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchViolations()
  }, [filters])

  const fetchViolations = async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filters.type !== 'all') params.append('type', filters.type)
    if (filters.severity !== 'all') params.append('severity', filters.severity)
    if (filters.reviewed !== 'all') params.append('reviewed', filters.reviewed)

    const res = await fetch(`/api/admin/violations?${params}`)
    const data = await res.json()
    setViolations(data.violations || [])
    setLoading(false)
  }

  const toggleContent = (id: string) => {
    setRevealedContent(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  if (loading) {
    return <div className="text-center py-12">Loading violations...</div>
  }

  return (
    <Card className="p-6">
      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <Select value={filters.type} onValueChange={(v) => setFilters({...filters, type: v})}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="PHONE_DETECTED">Phone</SelectItem>
            <SelectItem value="EMAIL_DETECTED">Email</SelectItem>
            <SelectItem value="BYPASS_ATTEMPT">Bypass</SelectItem>
            <SelectItem value="SUSPICIOUS_PATTERN">Suspicious</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.severity} onValueChange={(v) => setFilters({...filters, severity: v})}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severities</SelectItem>
            <SelectItem value="LOW">Low</SelectItem>
            <SelectItem value="MEDIUM">Medium</SelectItem>
            <SelectItem value="HIGH">High</SelectItem>
            <SelectItem value="CRITICAL">Critical</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.reviewed} onValueChange={(v) => setFilters({...filters, reviewed: v})}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="false">Unreviewed</SelectItem>
            <SelectItem value="true">Reviewed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b">
            <tr className="text-left">
              <th className="pb-3 font-semibold">Date</th>
              <th className="pb-3 font-semibold">Job</th>
              <th className="pb-3 font-semibold">User</th>
              <th className="pb-3 font-semibold">Type</th>
              <th className="pb-3 font-semibold">Severity</th>
              <th className="pb-3 font-semibold">Content</th>
              <th className="pb-3 font-semibold">Status</th>
              <th className="pb-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {violations.map((violation) => (
              <tr key={violation.id} className="border-b hover:bg-muted/50">
                <td className="py-4">
                  {new Date(violation.createdAt).toLocaleDateString('sl-SI')}
                </td>
                <td className="py-4">
                  <div>
                    <span className="font-medium">#{violation.job.id.slice(0, 8)}</span>
                    <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                      {violation.job.title}
                    </p>
                  </div>
                </td>
                <td className="py-4">
                  <div>
                    <p className="font-medium">{violation.user.name}</p>
                    <p className="text-xs text-muted-foreground">{violation.user.email}</p>
                    {violation.user.craftworkerProfile?.isSuspended && (
                      <Badge variant="destructive" className="mt-1 text-xs">
                        <UserX className="h-3 w-3 mr-1" />
                        Suspended
                      </Badge>
                    )}
                  </div>
                </td>
                <td className="py-4">
                  <Badge variant="outline">
                    {typeLabels[violation.type]}
                  </Badge>
                </td>
                <td className="py-4">
                  <Badge className={severityColors[violation.severity as keyof typeof severityColors]}>
                    {violation.severity}
                  </Badge>
                </td>
                <td className="py-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleContent(violation.id)}
                    className="gap-2"
                  >
                    {revealedContent.has(violation.id) ? (
                      <>
                        <EyeOff className="h-4 w-4" />
                        Hide
                      </>
                    ) : (
                      <>
                        <Eye className="h-4 w-4" />
                        Reveal
                      </>
                    )}
                  </Button>
                  {revealedContent.has(violation.id) && (
                    <p className="mt-2 text-xs bg-muted p-2 rounded font-mono max-w-[300px]">
                      {violation.detectedContent}
                    </p>
                  )}
                </td>
                <td className="py-4">
                  {violation.isReviewed ? (
                    <Badge variant="secondary">Reviewed</Badge>
                  ) : (
                    <Badge variant="destructive">Pending</Badge>
                  )}
                </td>
                <td className="py-4">
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      <AlertCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {violations.length === 0 && (
        <p className="text-center py-8 text-muted-foreground">
          No violations found matching your filters
        </p>
      )}
    </Card>
  )
}
