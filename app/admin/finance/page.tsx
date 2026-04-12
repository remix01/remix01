'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function AdminFinancePage() {
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    fetch('/api/admin/revenue').then((r) => r.json()).then(setData)
  }, [])

  const monthlyRevenue = data?.monthly || []

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Finance Dashboard</h1>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card><CardHeader><CardTitle>Revenue (30d)</CardTitle></CardHeader><CardContent>€{Number(data?.revenue_30d || 0).toFixed(2)}</CardContent></Card>
        <Card><CardHeader><CardTitle>Commission (30d)</CardTitle></CardHeader><CardContent>€{Number(data?.commission_30d || 0).toFixed(2)}</CardContent></Card>
        <Card><CardHeader><CardTitle>Pending payouts</CardTitle></CardHeader><CardContent>€{Number(data?.pending_payouts || 0).toFixed(2)}</CardContent></Card>
      </div>
      <Card>
        <CardHeader><CardTitle>Monthly Revenue</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {monthlyRevenue.map((m: any) => (
            <div key={m.month} className="flex justify-between border-b pb-1"><span>{m.month}</span><span>€{Number(m.revenue || 0).toFixed(2)}</span></div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
