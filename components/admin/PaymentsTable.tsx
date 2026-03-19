'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Download } from 'lucide-react'

interface Transaction {
  id: string
  created_at: string
  stranka_name: string
  obrtnik_name: string
  amount: number
  payment_status: string
}

interface Payout {
  id: string
  created_at: string
  craftsman_name: string
  amount: number
  stripe_transfer_id: string
}

interface Stats {
  totalTransactions: number
  totalRevenue: number
  pendingEscrow: number
  totalPayouts: number
}

export function PaymentsTable() {
  const [stats, setStats] = useState<Stats>({
    totalTransactions: 0,
    totalRevenue: 0,
    pendingEscrow: 0,
    totalPayouts: 0,
  })
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchPaymentData()
  }, [])

  const fetchPaymentData = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/payments')
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Failed to fetch payment data')

      const txns: Transaction[] = data.transactions ?? []
      const pyts: Payout[] = data.payouts ?? []

      setTransactions(txns)
      setPayouts(pyts)

      const totalRev = txns.reduce((sum, tx) => sum + (tx.payment_status === 'succeeded' ? tx.amount : 0), 0)
      const pendingEsc = txns.reduce((sum, tx) => sum + (tx.payment_status === 'pending' ? tx.amount : 0), 0)
      const totalPay = pyts.reduce((sum, p) => sum + p.amount, 0)

      setStats({
        totalTransactions: txns.length,
        totalRevenue: totalRev,
        pendingEscrow: pendingEsc,
        totalPayouts: totalPay,
      })
    } catch (err) {
      console.error('[admin] Failed to fetch payment data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch payment data')
    } finally {
      setLoading(false)
    }
  }

  const handleExportCSV = () => {
    try {
      // Create CSV content
      let csv = 'Date,Customer,Craftsman,Amount,Status\n'
      transactions.forEach(tx => {
        csv += `"${new Date(tx.created_at).toLocaleDateString('sl-SI')}","${tx.stranka_name}","${tx.obrtnik_name}","${tx.amount}","${tx.payment_status}"\n`
      })

      const blob = new Blob([csv], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `placila-export-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error('[v0] Failed to export CSV:', err)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      succeeded: 'default',
      pending: 'secondary',
      failed: 'destructive',
      refunded: 'outline',
    }
    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>
  }

  if (loading) {
    return <div className="py-8 text-center text-muted-foreground">Nalaganje...</div>
  }

  if (error) {
    return <div className="py-8 text-center text-red-600">Error: {error}</div>
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-6">
          <div className="text-sm font-medium text-muted-foreground mb-1">Skupaj transakcij</div>
          <div className="text-3xl font-bold">{stats.totalTransactions}</div>
        </Card>
        <Card className="p-6">
          <div className="text-sm font-medium text-muted-foreground mb-1">Skupaj prihodkov</div>
          <div className="text-3xl font-bold">€{stats.totalRevenue.toFixed(2)}</div>
        </Card>
        <Card className="p-6">
          <div className="text-sm font-medium text-muted-foreground mb-1">Čakajočih escrow</div>
          <div className="text-3xl font-bold">€{stats.pendingEscrow.toFixed(2)}</div>
        </Card>
        <Card className="p-6">
          <div className="text-sm font-medium text-muted-foreground mb-1">Izplačanih obrtnikov</div>
          <div className="text-3xl font-bold">€{stats.totalPayouts.toFixed(2)}</div>
        </Card>
      </div>

      {/* Export Button */}
      <div className="flex justify-end">
        <Button onClick={handleExportCSV} className="gap-2">
          <Download className="h-4 w-4" />
          Izvozi CSV
        </Button>
      </div>

      {/* Transactions Table */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Stripe transakcije</h3>
        <div className="rounded-lg border bg-card overflow-hidden">
          {transactions.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              Ni transakcij
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-6 py-3 text-left font-medium">Datum</th>
                    <th className="px-6 py-3 text-left font-medium">Stranka</th>
                    <th className="px-6 py-3 text-left font-medium">Obrtnik</th>
                    <th className="px-6 py-3 text-left font-medium">Znesek</th>
                    <th className="px-6 py-3 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="border-b hover:bg-muted/50">
                      <td className="px-6 py-3">
                        {new Date(tx.created_at).toLocaleDateString('sl-SI')}
                      </td>
                      <td className="px-6 py-3">{tx.stranka_name}</td>
                      <td className="px-6 py-3">{tx.obrtnik_name}</td>
                      <td className="px-6 py-3 font-medium">€{tx.amount.toFixed(2)}</td>
                      <td className="px-6 py-3">{getStatusBadge(tx.payment_status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Payouts Table */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Izplačila obrtnikov</h3>
        <div className="rounded-lg border bg-card overflow-hidden">
          {payouts.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              Ni izplačil
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-6 py-3 text-left font-medium">Datum</th>
                    <th className="px-6 py-3 text-left font-medium">Obrtnik</th>
                    <th className="px-6 py-3 text-left font-medium">Znesek</th>
                    <th className="px-6 py-3 text-left font-medium">Stripe ID</th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.map((payout) => (
                    <tr key={payout.id} className="border-b hover:bg-muted/50">
                      <td className="px-6 py-3">
                        {new Date(payout.created_at).toLocaleDateString('sl-SI')}
                      </td>
                      <td className="px-6 py-3">{payout.craftsman_name}</td>
                      <td className="px-6 py-3 font-medium">€{payout.amount.toFixed(2)}</td>
                      <td className="px-6 py-3 text-xs font-mono">{payout.stripe_transfer_id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
