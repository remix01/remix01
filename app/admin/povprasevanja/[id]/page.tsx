import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function AdminPovprasevanjeDetailPage({ params }: PageProps) {
  const { id } = await params

  const { data: povprasevanje, error } = await supabaseAdmin
    .from('povprasevanja')
    .select(`
      id,
      title,
      description,
      location_city,
      urgency,
      status,
      created_at,
      budget_min,
      budget_max,
      location_notes,
      categories(name),
      profiles!povprasevanja_narocnik_id_fkey(full_name, email)
    `)
    .eq('id', id)
    .maybeSingle()

  if (error) {
    throw new Error(`Povpraševanja ni mogoče naložiti (${error.message})`)
  }

  if (!povprasevanje) {
    return <div className="p-4">Povpraševanje ni najdeno</div>
  }

  async function updateStatus(formData: FormData) {
    'use server'
    const status = String(formData.get('status') || '')
    const adminNote = String(formData.get('admin_note') || '').trim()

    const { error: updateError } = await supabaseAdmin
      .from('povprasevanja')
      .update({
        status,
        location_notes: adminNote || null,
      })
      .eq('id', id)

    if (updateError) {
      throw new Error(updateError.message)
    }

    revalidatePath('/admin/povprasevanja')
    revalidatePath(`/admin/povprasevanja/${id}`)
  }

  async function archiveRequest() {
    'use server'
    await supabaseAdmin
      .from('povprasevanja')
      .update({ status: 'preklicano' })
      .eq('id', id)
    revalidatePath('/admin/povprasevanja')
    redirect('/admin/povprasevanja')
  }

  return (
    <div className="space-y-6">
      <Link
        href="/admin/povprasevanja"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Nazaj na seznam
      </Link>

      <div>
        <h1 className="text-3xl font-bold">{povprasevanje.title}</h1>
        <p className="text-muted-foreground">Urejanje povpraševanja</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Podrobnosti</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div><span className="text-sm text-muted-foreground">Kategorija</span><div>{(povprasevanje as any).categories?.name || '—'}</div></div>
          <div><span className="text-sm text-muted-foreground">Mesto</span><div>{povprasevanje.location_city}</div></div>
          <div><span className="text-sm text-muted-foreground">Naročnik</span><div>{(povprasevanje as any).profiles?.full_name || (povprasevanje as any).profiles?.email || '—'}</div></div>
          <div><span className="text-sm text-muted-foreground">Datum</span><div>{new Date(povprasevanje.created_at).toLocaleString('sl-SI')}</div></div>
          <div><span className="text-sm text-muted-foreground">Proračun</span><div>{povprasevanje.budget_min ?? '—'} - {povprasevanje.budget_max ?? '—'} €</div></div>
          <div><span className="text-sm text-muted-foreground">Nujnost</span><div>{povprasevanje.urgency}</div></div>
          <div className="md:col-span-2"><span className="text-sm text-muted-foreground">Opis</span><p className="mt-1 whitespace-pre-wrap">{povprasevanje.description}</p></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Admin urejanje</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateStatus} className="space-y-4">
            <div>
              <Label htmlFor="status">Status</Label>
              <select id="status" name="status" defaultValue={povprasevanje.status} className="mt-1 w-full rounded-md border px-3 py-2">
                <option value="odprto">Odprto</option>
                <option value="v_teku">V teku</option>
                <option value="zakljuceno">Zaključeno</option>
                <option value="preklicano">Preklicano</option>
              </select>
            </div>
            <div>
              <Label htmlFor="admin_note">Admin opomba</Label>
              <Textarea id="admin_note" name="admin_note" defaultValue={povprasevanje.location_notes ?? ''} rows={4} />
            </div>
            <div className="flex flex-wrap gap-3">
              <Button type="submit">Shrani spremembe</Button>
            </div>
          </form>
          <form action={archiveRequest} className="mt-3">
            <Button type="submit" variant="destructive">Označi kot preklicano</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
