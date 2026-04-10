/**
 * Skill: Generiranje predračunov (AI Invoice Generator)
 *
 * Combines Claude + Stripe to:
 *   1. Generate a professional Slovenian invoice description from job data
 *   2. Create a Stripe Invoice (or Payment Link) with the AI-generated line items
 *   3. Return a pay link to send to the customer
 *
 * Supports two modes:
 *   - draft: create as draft, craftsman reviews before sending
 *   - auto:  finalize & send immediately (PRO feature)
 *
 * Env:
 *   ANTHROPIC_API_KEY
 *   STRIPE_SECRET_KEY
 */

import Anthropic from '@anthropic-ai/sdk'
import Stripe from 'stripe'

export interface JobData {
  taskTitle: string
  taskDescription: string
  craftsmanName: string
  craftsmanSpecialty: string
  customerName: string
  customerEmail: string
  startDate: string        // ISO date
  endDate?: string
  materials?: string[]     // raw material list from craftsman notes
  laborHours?: number
  laborRateEur?: number
  additionalNotes?: string
}

export interface InvoiceLineItem {
  description: string
  quantity: number
  unitAmountEur: number
  unit: string             // 'ura' | 'kos' | 'paušal'
}

export interface GeneratedInvoice {
  lineItems: InvoiceLineItem[]
  introText: string        // Professional intro paragraph
  totalEur: number
  stripeInvoiceId?: string
  stripePaymentUrl?: string
  status: 'draft' | 'finalized' | 'error'
  error?: string
}

// ── Claude prompt ────────────────────────────────────────────────────────────

function buildInvoicePrompt(job: JobData): string {
  return `You are a professional billing assistant for LiftGO, a Slovenian home services marketplace.

Generate invoice content for a completed job. Write in Slovenian.

## Job Details
Naslov: ${job.taskTitle}
Opis: ${job.taskDescription}
Mojster: ${job.craftsmanName} (${job.craftsmanSpecialty})
Stranka: ${job.customerName}
Datum: ${job.startDate}${job.endDate ? ` – ${job.endDate}` : ''}
Delovne ure: ${job.laborHours ?? 'neznano'}
Urna postavka: ${job.laborRateEur ? `${job.laborRateEur} €/h` : 'ni določeno'}
Material: ${job.materials?.join(', ') ?? 'ni navedeno'}
Opombe: ${job.additionalNotes ?? '/'}

## Output format (strict JSON)
{
  "introText": "2-3 sentence professional Slovenian intro describing the work done",
  "lineItems": [
    {
      "description": "item description in Slovenian",
      "quantity": 2.5,
      "unitAmountEur": 45.00,
      "unit": "ura"
    }
  ]
}

Rules:
- Split labor and materials into separate line items
- Use realistic EUR amounts matching Slovenian market rates
- description must be professional and specific
- unit is one of: ura, kos, m², m³, paušal
- If labor hours/rate known, use them exactly; otherwise estimate professionally`
}

// ── Main generator ───────────────────────────────────────────────────────────

export async function generateInvoice(
  job: JobData,
  mode: 'draft' | 'auto' = 'draft'
): Promise<GeneratedInvoice> {
  const anthropic = new Anthropic()

  // Step 1: Generate content with Claude
  let lineItems: InvoiceLineItem[] = []
  let introText = ''

  try {
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: buildInvoicePrompt(job) }],
    })

    const raw = msg.content[0].type === 'text' ? msg.content[0].text : ''
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in response')

    const parsed = JSON.parse(jsonMatch[0])
    introText = parsed.introText ?? ''
    lineItems = parsed.lineItems ?? []
  } catch (err) {
    return {
      lineItems: [],
      introText: '',
      totalEur: 0,
      status: 'error',
      error: err instanceof Error ? err.message : 'Claude error',
    }
  }

  const totalEur = lineItems.reduce(
    (sum, item) => sum + item.quantity * item.unitAmountEur,
    0
  )

  // Step 2: Create Stripe Invoice
  if (!process.env.STRIPE_SECRET_KEY) {
    return { lineItems, introText, totalEur, status: 'draft' }
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

  try {
    // Find or create customer
    const customers = await stripe.customers.list({ email: job.customerEmail, limit: 1 })
    const customer =
      customers.data[0] ??
      (await stripe.customers.create({
        email: job.customerEmail,
        name: job.customerName,
        metadata: { source: 'liftgo_invoice_generator' },
      }))

    // Create invoice
    const invoice = await stripe.invoices.create({
      customer: customer.id,
      collection_method: 'send_invoice',
      days_until_due: 14,
      description: introText,
      metadata: {
        task_title: job.taskTitle,
        craftsman: job.craftsmanName,
        generated_by: 'liftgo_ai',
      },
    })

    // Add line items
    for (const item of lineItems) {
      await stripe.invoiceItems.create({
        customer: customer.id,
        invoice: invoice.id,
        description: `${item.description} (${item.unit})`,
        quantity: Math.max(1, Math.round(item.quantity * 100)), // Stripe uses integers
        unit_amount: Math.round((item.unitAmountEur / 100) * 100), // cents
        currency: 'eur',
      })
    }

    // Finalize if auto mode
    let finalInvoice = invoice
    if (mode === 'auto') {
      finalInvoice = await stripe.invoices.finalizeInvoice(invoice.id)
      await stripe.invoices.sendInvoice(finalInvoice.id)
    }

    return {
      lineItems,
      introText,
      totalEur,
      stripeInvoiceId: finalInvoice.id,
      stripePaymentUrl: finalInvoice.hosted_invoice_url ?? undefined,
      status: mode === 'auto' ? 'finalized' : 'draft',
    }
  } catch (err) {
    // Return the AI content even if Stripe fails
    return {
      lineItems,
      introText,
      totalEur,
      status: 'error',
      error: err instanceof Error ? err.message : 'Stripe error',
    }
  }
}
