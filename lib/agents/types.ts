import type { TestWritingRequest, TestWritingResult } from './codexTestWriter'

export interface AgentState {
  pendingChanges: Array<Record<string, unknown>>
  results: Array<Record<string, unknown>>
  pendingTests: TestWritingRequest[]
  testResults: TestWritingResult[]
  testErrors?: Array<{ componentPath: string; error: string }>
}
