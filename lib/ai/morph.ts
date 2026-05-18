import type { Tool } from '@anthropic-ai/sdk/resources/messages'

let cachedEditTool: Tool | null = null
let cachedEditToolHandler: ((input: Record<string, unknown>) => Promise<unknown>) | null = null
let cachedWarpGrep: ((query: string) => Promise<string>) | null = null

export async function getMorphFastApplyTool(): Promise<{ tool: Tool; run: (input: Record<string, unknown>) => Promise<unknown> } | null> {
  if (cachedEditTool && cachedEditToolHandler) {
    return { tool: cachedEditTool, run: cachedEditToolHandler }
  }

  if (!process.env.MORPH_API_KEY) return null

  try {
    const morphFastApplyModule = '@morphllm/morphsdk/tools/fastapply/anthropic'
    const mod = await import(morphFastApplyModule)
    const created = mod.createEditFileTool({ apiKey: process.env.MORPH_API_KEY })
    cachedEditTool = created.tool as Tool
    cachedEditToolHandler = async (input: Record<string, unknown>) => created.execute(input)
    return { tool: cachedEditTool, run: cachedEditToolHandler }
  } catch {
    return null
  }
}

export async function getWarpGrepSubagentRunner(): Promise<((query: string) => Promise<string>) | null> {
  if (cachedWarpGrep) return cachedWarpGrep
  if (!process.env.MORPH_API_KEY) return null

  try {
    const morphSubagentModule = '@morphllm/morphsdk/subagents/anthropic'
    const mod = await import(morphSubagentModule)
    const subagent = mod.createExploreSubagent({
      apiKey: process.env.MORPH_API_KEY,
      maxParallelToolCalls: 8,
    })

    cachedWarpGrep = async (query: string) => {
      const result = await subagent.run({ query })
      return typeof result?.summary === 'string' ? result.summary : JSON.stringify(result)
    }
    return cachedWarpGrep
  } catch {
    return null
  }
}
