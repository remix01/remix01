interface CommissionHistoryProps {
  jobs: any[]
  commissionRate: number
}

export function CommissionHistory({ jobs, commissionRate }: CommissionHistoryProps) {
  const completedJobs = jobs.filter(j => j.status === 'COMPLETED' && j.payment)
  
  const totalEarned = completedJobs.reduce((sum, j) => {
    return sum + (Number(j.payment.craftworkerPayout) || 0)
  }, 0)

  const totalCommission = completedJobs.reduce((sum, j) => {
    return sum + (Number(j.payment.platformFee) || 0)
  }, 0)

  return (
    <div className="rounded-lg border bg-card p-6">
      <h3 className="text-lg font-semibold mb-4">Provizija zgodovina</h3>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <div className="text-sm text-muted-foreground">Skupaj zasluženo</div>
          <div className="text-2xl font-bold text-green-600">€{totalEarned.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground">Skupaj provizija</div>
          <div className="text-2xl font-bold text-primary">€{totalCommission.toFixed(2)}</div>
        </div>
      </div>

      <div className="text-sm text-muted-foreground mb-4">
        Trenutna stopnja provizije: <span className="font-medium">{(commissionRate * 100).toFixed(0)}%</span>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {completedJobs.map((job) => (
          <div key={job.id} className="flex justify-between items-center py-2 border-b text-sm">
            <div>
              <div className="font-medium">{job.title}</div>
              <div className="text-xs text-muted-foreground">
                {new Date(job.completedAt).toLocaleDateString('sl-SI')}
              </div>
            </div>
            <div className="text-right">
              <div className="font-medium text-green-600">
                €{Number(job.payment.craftworkerPayout).toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground">
                Provizija: €{Number(job.payment.platformFee).toFixed(2)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
