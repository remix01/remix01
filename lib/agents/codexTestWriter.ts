import { createLangChainChatModel } from '@/lib/ai/langsmith'

export interface TestWritingRequest {
  componentPath: string
  componentCode: string
  existingTests?: string
  framework?: 'jest' | 'vitest'
}

export interface TestWritingResult {
  testFilePath: string
  testCode: string
  reasoning: string
  model: string
}

interface ParsedModelOutput {
  testFilePath: string
  testCode: string
  reasoning: string
}

const DEFAULT_MODEL = process.env.OPENAI_TEST_WRITER_MODEL ?? 'gpt-4.1-mini'

function buildPrompt(req: TestWritingRequest): string { return `You are an expert test engineer for TypeScript React projects using ${req.framework ?? 'jest'} + React Testing Library.
Given component file ${req.componentPath}:
\`\`\`tsx
${req.componentCode}
\`\`\`
${req.existingTests ? `Existing tests:\n\`\`\`ts\n${req.existingTests}\n\`\`\`` : 'No existing tests.'}
Return ONLY valid JSON with keys: testFilePath, testCode, reasoning.` }

function validateResult(parsed: ParsedModelOutput): TestWritingResult {
  if (!parsed.testFilePath || !parsed.testCode || !parsed.reasoning) throw new Error('Model response missing required fields')
  return { ...parsed, model: DEFAULT_MODEL }
}

export async function writeTestsWithCodex(req: TestWritingRequest): Promise<TestWritingResult> {
  if (!req.componentPath?.trim()) throw new Error('componentPath is required')
  if (!req.componentCode?.trim()) throw new Error('componentCode is required')

  const chat = await createLangChainChatModel({ model: DEFAULT_MODEL, temperature: 0.1 })
  const response = await chat.invoke(buildPrompt(req))
  const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content)

  let parsed: ParsedModelOutput
  try { parsed = JSON.parse(content) as ParsedModelOutput } catch (error) { throw new Error(`Invalid JSON from test writer model: ${String(error)}`) }
  return validateResult(parsed)
}
