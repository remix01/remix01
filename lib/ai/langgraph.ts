import { createLangChainChatModel, getLangSmithStatus } from '@/lib/ai/langsmith'

export interface LangGraphRunInput {
  prompt: string
  model?: string
  temperature?: number
}

export interface LangGraphRunResult {
  output: string
  tracing: ReturnType<typeof getLangSmithStatus>
}

/**
 * Build and execute a tiny LangGraph state machine:
 * START -> generate_response -> END
 */
export async function runLangGraphChat(input: LangGraphRunInput): Promise<LangGraphRunResult> {
  const dynamicImport = new Function('m', 'return import(m)') as (moduleName: string) => Promise<any>
  const { StateGraph, START, END, Annotation } = await dynamicImport('@langchain/langgraph')

  const State = Annotation.Root({
    prompt: Annotation,
    output: Annotation,
  })

  const graph = new StateGraph(State)
    .addNode('generate_response', async (state: { prompt: string }) => {
      const chat = await createLangChainChatModel({
        model: input.model,
        temperature: input.temperature,
      })

      const response = await chat.invoke(state.prompt)
      const output =
        typeof response.content === 'string'
          ? response.content
          : JSON.stringify(response.content)

      return { output }
    })
    .addEdge(START, 'generate_response')
    .addEdge('generate_response', END)

  const app = graph.compile()
  const result = await app.invoke({ prompt: input.prompt, output: '' })

  return {
    output: result.output,
    tracing: getLangSmithStatus(),
  }
}
