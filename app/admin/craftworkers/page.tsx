import { CraftworkersTable } from '@/components/admin/CraftworkersTable'

export default function AdminCraftworkersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Obrtniki</h1>
        <p className="mt-2 text-muted-foreground">
          Upravljanje in monitoring obrtniških računov
        </p>
      </div>

      <CraftworkersTable />
    </div>
  )
}
