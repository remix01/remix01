import { PaymentsTable } from '@/components/admin/PaymentsTable'

export default function AdminPaymentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Plačila</h1>
        <p className="mt-2 text-muted-foreground">
          Upravljanje Stripe transakcij in izplačil obrtnikov
        </p>
      </div>

      <PaymentsTable />
    </div>
  )
}
