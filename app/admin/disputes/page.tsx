import { DisputesTable } from '@/components/admin/DisputesTable'

export default function AdminDisputesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Spori</h1>
        <p className="mt-2 text-muted-foreground">
          Upravljanje odprtih escrow sporov
        </p>
      </div>

      <DisputesTable />
    </div>
  )
}
