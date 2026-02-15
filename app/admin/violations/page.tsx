import { ViolationsTable } from '@/components/admin/ViolationsTable'

export default function ViolationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Violations Log</h1>
        <p className="mt-2 text-muted-foreground">
          Review and manage all detected violations
        </p>
      </div>

      <ViolationsTable />
    </div>
  )
}
