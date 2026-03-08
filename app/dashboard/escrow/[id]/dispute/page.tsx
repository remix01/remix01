import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { OpenDisputeForm } from './components/OpenDisputeForm'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

interface PageProps {
  params: Promise<{ id: string }>
}

export const metadata = {
  title: 'Odpri spor | LiftGO',
  description: 'Odprite spor za escrow transakcijo',
}

export default async function OpenDisputePage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (!user || authError) {
    redirect('/prijava')
  }

  // Fetch escrow transaction
  const { data: escrow, error: escrowError } = await supabase
    .from('escrow_transactions')
    .select(
      `
      id,
      status,
      amount_cents,
      created_by,
      customer_name,
      partner_name
    `
    )
    .eq('id', id)
    .maybeSingle()

  if (escrowError || !escrow) {
    redirect('/dashboard')
  }

  // Verify ownership
  if (escrow.created_by !== user.id) {
    redirect('/dashboard')
  }

  // Check escrow status - only 'paid' or 'captured' can be disputed
  if (!['paid', 'captured'].includes(escrow.status)) {
    redirect(`/dashboard/escrow/${id}`)
  }

  return (
    <main className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link href={`/dashboard/escrow/${id}`}>
            <Button variant="ghost" size="sm" className="mb-4">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Nazaj na transakcijo
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-foreground">Odpri spor</h1>
          <p className="mt-2 text-muted-foreground">
            Prosim opišite vaš problem in opis bo pošljen našem timu na pregled.
          </p>
        </div>

        {/* Form */}
        <OpenDisputeForm
          escrowId={id}
          customerName={escrow.customer_name || 'Stranka'}
          partnerName={escrow.partner_name || 'Partner'}
          amount={escrow.amount_cents || 0}
        />
      </div>
    </main>
  )
}
