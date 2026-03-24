'use client'

/**
 * ApprovalWidget
 *
 * Displays pending Human-in-the-Loop approval requests and lets admins/approvers
 * approve or reject them in one click.
 *
 * Usage (execution-scoped — show approvals for one AI run):
 *   <ApprovalWidget executionId="exec-abc123" approverId={userId} />
 *
 * Usage (inbox — show all pending approvals for the current user):
 *   <ApprovalWidget approverId={userId} />
 */

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'

// ---------------------------------------------------------------------------
// Types (matches hitl_approvals table)
// ---------------------------------------------------------------------------

type HITLStatus = 'pending' | 'approved' | 'rejected'

interface HITLApproval {
  id: string
  execution_id: string
  agent_name: string
  description: string
  context: Record<string, unknown>
  status: HITLStatus
  approver_id: string | null
  approver_note: string | null
  created_at: string
  updated_at: string
}

interface ApprovalWidgetProps {
  /** If provided, only shows approvals for this execution (realtime-scoped). */
  executionId?: string
  /** The user ID of the approver (used when submitting decisions). */
  approverId: string
  /** Called after any approve/reject action completes. */
  onDecision?: (approval: HITLApproval, action: 'approve' | 'reject') => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ApprovalWidget({ executionId, approverId, onDecision }: ApprovalWidgetProps) {
  const [approvals, setApprovals] = useState<HITLApproval[]>([])
  const [loading, setLoading] = useState(true)
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState<Record<string, boolean>>({})

  // -------------------------------------------------------------------------
  // Load initial data
  // -------------------------------------------------------------------------

  const fetchApprovals = useCallback(async () => {
    const supabase = createClient()
    let query = supabase
      .from('hitl_approvals')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (executionId) {
      query = query.eq('execution_id', executionId)
    } else {
      query = query.or(`approver_id.is.null,approver_id.eq.${approverId}`)
    }

    const { data } = await query
    setApprovals((data ?? []) as HITLApproval[])
    setLoading(false)
  }, [executionId, approverId])

  useEffect(() => {
    fetchApprovals()
  }, [fetchApprovals])

  // -------------------------------------------------------------------------
  // Realtime subscription
  // -------------------------------------------------------------------------

  useEffect(() => {
    const supabase = createClient()

    const filter = executionId
      ? `execution_id=eq.${executionId}`
      : undefined

    const channel = supabase
      .channel(`hitl-widget:${executionId ?? approverId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'hitl_approvals',
          ...(filter ? { filter } : {}),
        },
        () => {
          // Re-fetch on any change so list stays accurate
          fetchApprovals()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [executionId, approverId, fetchApprovals])

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------

  async function handleDecision(approval: HITLApproval, action: 'approve' | 'reject') {
    setSubmitting((s) => ({ ...s, [approval.id]: true }))

    try {
      const res = await fetch(`/api/ai/hitl/approve/${approval.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, note: notes[approval.id] ?? '' }),
      })

      if (!res.ok) {
        console.error(`[ApprovalWidget] ${action} failed:`, await res.text())
        return
      }

      // Optimistically remove from list
      setApprovals((prev) => prev.filter((a) => a.id !== approval.id))
      onDecision?.({ ...approval, status: action === 'approve' ? 'approved' : 'rejected' }, action)
    } finally {
      setSubmitting((s) => ({ ...s, [approval.id]: false }))
    }
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="rounded-xl border border-gray-200 bg-white p-4 animate-pulse">
            <div className="h-4 w-48 bg-gray-200 rounded mb-2" />
            <div className="h-3 w-full bg-gray-100 rounded mb-1" />
            <div className="h-3 w-3/4 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
    )
  }

  if (approvals.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
        Ni čakajočih odobrenj.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {approvals.map((approval) => (
        <Card key={approval.id} className="border-amber-200 bg-amber-50/40">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-sm font-semibold leading-snug">
                {approval.description}
              </CardTitle>
              <Badge variant="outline" className="shrink-0 border-amber-400 text-amber-700 text-xs">
                {approval.agent_name}
              </Badge>
            </div>
            <p className="text-xs text-gray-500">
              {new Date(approval.created_at).toLocaleString('sl-SI')}
            </p>
          </CardHeader>

          {Object.keys(approval.context).length > 0 && (
            <CardContent className="pt-0 pb-2">
              <div className="rounded-md bg-white border border-amber-100 p-3 text-xs font-mono text-gray-600 overflow-auto max-h-32">
                {JSON.stringify(approval.context, null, 2)}
              </div>
            </CardContent>
          )}

          <CardFooter className="flex flex-col gap-2 pt-2">
            <Textarea
              placeholder="Opomba (neobvezno)…"
              className="text-xs resize-none h-16 bg-white"
              value={notes[approval.id] ?? ''}
              onChange={(e) =>
                setNotes((n) => ({ ...n, [approval.id]: e.target.value }))
              }
            />
            <div className="flex gap-2 w-full">
              <Button
                size="sm"
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                disabled={submitting[approval.id]}
                onClick={() => handleDecision(approval, 'approve')}
              >
                {submitting[approval.id] ? '…' : '✓ Potrdi'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                disabled={submitting[approval.id]}
                onClick={() => handleDecision(approval, 'reject')}
              >
                {submitting[approval.id] ? '…' : '✕ Zavrni'}
              </Button>
            </div>
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}
