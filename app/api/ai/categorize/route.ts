import { NextResponse } from 'next/server'

const CATEGORY_RULES: Array<{ keywords: string[]; category: string; estimateMin: number; estimateMax: number }> = [
  { keywords: ['pipa', 'vodovod', 'odtok', 'bojler', 'cev'], category: 'Vodovodar', estimateMin: 80, estimateMax: 450 },
  { keywords: ['elektrika', 'varovalka', 'vtičnica', 'luč', 'stikalo'], category: 'Električar', estimateMin: 70, estimateMax: 500 },
  { keywords: ['stena', 'pleskanje', 'barvanje', 'fasada'], category: 'Slikopleskar', estimateMin: 120, estimateMax: 1200 },
  { keywords: ['ploščice', 'keramika', 'kopalnica'], category: 'Keramičar', estimateMin: 300, estimateMax: 2500 },
  { keywords: ['klima', 'hlajenje', 'servis klime'], category: 'Klima servis', estimateMin: 90, estimateMax: 700 },
]

export async function POST(req: Request) {
  try {
    const { message } = await req.json()
    const text = String(message || '').toLowerCase()

    const match = CATEGORY_RULES.find((rule) => rule.keywords.some((kw) => text.includes(kw)))

    if (match) {
      return NextResponse.json({
        category: match.category,
        estimateMin: match.estimateMin,
        estimateMax: match.estimateMax,
      })
    }

    return NextResponse.json({
      category: 'Splošna hišna opravila',
      estimateMin: 80,
      estimateMax: 800,
    })
  } catch (error) {
    console.error('[ai/categorize] Error:', error)
    return NextResponse.json({ error: 'Napaka pri kategorizaciji.' }, { status: 500 })
  }
}
