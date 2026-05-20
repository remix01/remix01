import { writeTestsWithCodex, type TestWritingResult } from './codexTestWriter'
import type { AgentState } from './types'

export async function testWriterNode(
  state: AgentState
): Promise<Partial<AgentState>> {
  const newTestResults: TestWritingResult[] = []
  const errors: Array<{ componentPath: string; error: string }> = []

  for (const testReq of state.pendingTests) {
    try {
      const result = await writeTestsWithCodex(testReq)
      newTestResults.push(result)
      console.log(`[Codex] Wrote tests for ${testReq.componentPath}: ${result.reasoning}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      errors.push({ componentPath: testReq.componentPath, error: message })
      console.error(`[Codex] Failed to write tests for ${testReq.componentPath}:`, message)
    }
  }

  return {
    testResults: [...state.testResults, ...newTestResults],
    testErrors: [...(state.testErrors ?? []), ...errors],
    pendingTests: [],
  }
}
