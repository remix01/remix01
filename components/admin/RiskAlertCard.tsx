'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MessageSquare, XCircle, Mail, CheckCircle } from 'lucide-react'

type Job = {
  id: string
  title: string
  category: string
  status: string
  city: string
  estimatedValue: any
  customer: { id: string; name: string; email: string }
  craftworker: { id: string; name: string; email: string } | null
  riskScore: { score: number; flags: any } | null
  payment: { amount: any; status: string } | null
}

function getRiskColor(score: number) {
  if (score >= 85) return 'from-red-600 to-red-800'
  if (score >= 70) return 'from-orange-500 to-red-600'
  return 'from-yellow-500 to-orange-500'
}

function getRiskLabel(score: number) {
  if (score >= 85) return 'CRITICAL'
  if (score >= 70) return 'HIGH'
  return 'MODERATE'
}

export function RiskAlertCard({ job }: { job: Job }) {
  const score = job.riskScore?.score || 0
  const flags = (job.riskScore?.flags as string[]) || []

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold text-foreground">
              {job.title}
            </h3>
            <Badge variant="outline">{job.category}</Badge>
            <Badge variant={job.status === 'DISPUTED' ? 'destructive' : 'secondary'}>
              {job.status}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Job #{job.id.slice(0, 8)} · {job.city}
            {job.estimatedValue && ` · €${Number(job.estimatedValue).toFixed(2)}`}
          </p>
        </div>

        {/* Risk Meter */}
        <div className="text-right">
          <div className={`text-3xl font-bold bg-gradient-to-r ${getRiskColor(score)} bg-clip-text text-transparent`}>
            {score}
          </div>
          <div className="text-xs font-semibold text-muted-foreground">
            {getRiskLabel(score)} RISK
          </div>
          <div className="mt-2 w-32 h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className={`h-full bg-gradient-to-r ${getRiskColor(score)}`}
              style={{ width: `${score}%` }}
            />
          </div>
        </div>
      </div>

      {/* Parties */}
      <div className="grid grid-cols-2 gap-4 mb-4 p-4 bg-muted/50 rounded-lg">
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-1">Customer</p>
          <p className="font-medium text-sm">{job.customer.name}</p>
          <p className="text-xs text-muted-foreground">{job.customer.email}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-1">Craftworker</p>
          {job.craftworker ? (
            <>
              <p className="font-medium text-sm">{job.craftworker.name}</p>
              <p className="text-xs text-muted-foreground">{job.craftworker.email}</p>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">Not assigned</p>
          )}
        </div>
      </div>

      {/* Flags */}
      {flags.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-muted-foreground mb-2">Risk Flags</p>
          <div className="flex flex-wrap gap-2">
            {flags.map((flag: string) => (
              <Badge key={flag} variant="destructive" className="text-xs">
                {flag.replace(/_/g, ' ')}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Button size="sm" variant="outline">
          <MessageSquare className="h-4 w-4 mr-2" />
          View Chat
        </Button>
        <Button size="sm" variant="outline">
          <Mail className="h-4 w-4 mr-2" />
          Contact Parties
        </Button>
        <Button size="sm" variant="destructive">
          <XCircle className="h-4 w-4 mr-2" />
          Close Job
        </Button>
        <Button size="sm" variant="default">
          <CheckCircle className="h-4 w-4 mr-2" />
          Resolve
        </Button>
      </div>
    </Card>
  )
}
