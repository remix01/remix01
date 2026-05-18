import { getWarpGrepSubagentRunner } from '@/lib/ai/morph'

export interface WarpGrepResult {
  summary: string
  repoRoot: string
  query: string
}

// Attempts MorphClient.warpGrep.execute(); returns null if SDK unavailable.
async function tryMorphClientWarpGrep(query: string): Promise<string | null> {
  if (!process.env.MORPH_API_KEY) return null
  try {
    const morphModule = '@morphllm/morphsdk'
    const mod = await import(morphModule)
    const MorphClient = (mod as Record<string, unknown>).MorphClient ?? mod.default
    if (!MorphClient || typeof MorphClient !== 'function') return null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const morph = new (MorphClient as any)({ apiKey: process.env.MORPH_API_KEY })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await morph.warpGrep.execute({ query })
    return typeof result?.summary === 'string' ? result.summary : JSON.stringify(result)
  } catch {
    return null
  }
}

export async function searchCodebase(query: string, repoRoot = '.'): Promise<WarpGrepResult> {
  const contextQuery = repoRoot !== '.' ? `[repo: ${repoRoot}] ${query}` : query

  let summary = await tryMorphClientWarpGrep(contextQuery)

  if (summary === null) {
    const runner = await getWarpGrepSubagentRunner()
    if (runner) {
      try {
        summary = await runner(contextQuery)
      } catch {
        summary = ''
      }
    } else {
      summary = ''
    }
  }

  return { summary, repoRoot, query }
}

export async function searchKnowledgeBase(query: string): Promise<WarpGrepResult> {
  return searchCodebase(query, './data/knowledge-base')
}
