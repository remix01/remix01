import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(request: Request) {
  try {
    const { description } = await request.json()

    if (!description || description.length < 10) {
      return Response.json({
        hint: 'Napišite več znakov za analizo',
        category: 'unknown',
      })
    }

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 150,
      system: `Si asistent na LiftGO platformi (iskanje obrtnikov, Slovenija). Vrni SAMO JSON brez markdown: {"hint":"kratek nasvet kaj dodati k opisu max 70 znakov slovenščina","category":"tip storitve"}. Če je opis jasen vrni hint: Opis je jasen — nadaljujte!`,
      messages: [
        {
          role: 'user',
          content: `Analiziraj ta opis dela in vrni JSON: "${description}"`,
        },
      ],
    })

    const textContent = message.content.find((block) => block.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      return Response.json({
        hint: 'Opis je jasen — nadaljujte!',
        category: 'unknown',
      })
    }

    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/)
    const result = jsonMatch
      ? JSON.parse(jsonMatch[0])
      : { hint: 'Opis je jasen — nadaljujte!', category: 'unknown' }

    return Response.json(result)
  } catch (error) {
    console.error('[v0] Error analyzing description:', error)
    return Response.json(
      {
        hint: 'Opis je jasen — nadaljujte!',
        category: 'unknown',
      },
      { status: 500 }
    )
  }
}
