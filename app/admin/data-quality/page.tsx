'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function DataQualityPage() {
  const [data, setData] = useState<any>(null)

  const load = async () => {
    const res = await fetch('/api/admin/data-quality')
    setData(await res.json())
  }

  useEffect(() => { load() }, [])

  const action = (msg: string) => alert(msg)

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Data Quality Agent</h1>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Duplicate profiles</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {(data?.duplicateUsers || []).slice(0, 10).map((u: any) => (
              <div key={u.id} className="rounded border p-2">
                <p>{u.full_name || u.email}</p>
                <Button size="sm" variant="outline" onClick={() => action('AI merge predlog bo dodan v naslednji iteraciji.')}>Merge</Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Incomplete craftsman profiles</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {(data?.incompleteCraftworkers || []).slice(0, 10).map((u: any) => (
              <div key={u.id} className="rounded border p-2 flex items-center justify-between">
                <p>{u.business_name || u.id}</p>
                <Button size="sm" variant="outline" onClick={() => action('Notify workflow queued.')}>Notify</Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Stale inquiries</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {(data?.staleInquiries || []).slice(0, 10).map((i: any) => (
              <div key={i.id} className="rounded border p-2 flex items-center justify-between">
                <p>{i.title || i.id}</p>
                <Button size="sm" variant="outline" onClick={() => action('Archive workflow queued.')}>Archive</Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
