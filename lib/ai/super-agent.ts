import Anthropic from '@anthropic-ai/sdk'
import type { TextBlock } from '@anthropic-ai/sdk/resources/messages'
import { runInE2B, type E2BExecutionResult } from '@/lib/ai/e2b'
import { searchCodebase } from '@/lib/ai/warp-grep'
import { getMorphFastApplyTool } from '@/lib/ai/morph'
import { selectModel } from '@/lib/model-router'

export interface SuperAgentResult {
  diff: string
  result: E2BExecutionResult
  summary: string
  modelUsed: string
  relatedFiles: string[]
}

// Tries morph.routers.anthropic.selectModel(); falls back to local model-router.
async function selectModelViaMorph(taskDescription: string): Promise<string> {
  if (!process.env.MORPH_API_KEY) return selectModel(taskDescription).modelId
  try {
    const morphModule = '@morphllm/morphsdk'
    const mod = await import(morphModule)
    const MorphClient = (mod as Record<string, unknown>).MorphClient ?? mod.default
    if (!MorphClient || typeof MorphClient !== 'function') return selectModel(taskDescription).modelId
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const morph = new (MorphClient as any)({ apiKey: process.env.MORPH_API_KEY })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const selected: any = await morph.routers.anthropic.selectModel({ prompt: taskDescription })
    // Check all known field names the router may return
    const modelId: unknown = selected?.model ?? selected?.modelId ?? selected?.model_id ?? selected?.selected_model
    return typeof modelId === 'string' ? modelId : selectModel(taskDescription).modelId
  } catch {
    return selectModel(taskDescription).modelId
  }
}

// Extract edited code from various result shapes FastApply may return.
function extractAppliedCode(applied: unknown): string | null {
  if (typeof applied === 'string') return applied
  if (applied && typeof applied === 'object') {
    const obj = applied as Record<string, unknown>
    for (const key of ['content', 'result', 'code', 'edited_file', 'output', 'text']) {
      if (typeof obj[key] === 'string') return obj[key] as string
    }
  }
  return null
}

function extractFileReferences(summary: string): string[] {
  const filePattern = /(?:^|\s)([\w./\\-]+\.[a-z]{2,6})(?:\s|$|:|,)/gm
  const matches: string[] = []
  let match: RegExpExecArray | null
  while ((match = filePattern.exec(summary)) !== null) {
    matches.push(match[1])
  }
  return [...new Set(matches)]
}

/**
 * MorphLM Super-Agent pipeline:
 * 1. WarpGrep  — find codebase context
 * 2. Fast Apply — generate modified code
 * 3. E2B       — execute in isolated sandbox
 * 4. Model Router — select cheapest suitable model
 * 5. Anthropic — summarize the result
 */
export async function morphAndExecuteWithContext(
  taskDescription: string,
  originalCode: string,
  filePath: string
): Promise<SuperAgentResult> {
  // Step 1: WarpGrep — locate relevant context
  const contextResult = await searchCodebase(`${taskDescription} file:${filePath}`)
  const relatedFiles = extractFileReferences(contextResult.summary).slice(0, 3)

  // Step 2: MorphLM Fast Apply — apply changes with context-aware instructions
  let diff = originalCode
  const fastApply = await getMorphFastApplyTool()
  if (fastApply) {
    try {
      const contextSuffix = relatedFiles.length
        ? `\n\nRelated files for context:\n${relatedFiles.join('\n')}`
        : ''
      // Fields match the edit_file_fastapply tool schema: target_filepath, instructions, code_edit
      const applied = await fastApply.run({
        target_filepath: filePath,
        instructions: `${taskDescription}${contextSuffix}`,
        code_edit: originalCode,
      })
      diff = extractAppliedCode(applied) ?? originalCode
    } catch {
      // Fast Apply unavailable — diff remains as originalCode
    }
  }

  // Step 3: E2B — execute modified code in isolated sandbox
  const e2bResult = await runInE2B(diff)

  // Step 4: MorphLM Model Router — cheapest model for the task
  const modelUsed = await selectModelViaMorph(taskDescription)

  // Step 5: Anthropic — summarise execution outcome
  const summary = await generateExecutionSummary({
    taskDescription,
    diff,
    e2bResult,
    modelUsed,
    filePath,
    relatedFiles,
  })

  return { diff, result: e2bResult, summary, modelUsed, relatedFiles }
}

// ─────────────────────────────────────────────────────────────────────────────

interface SummaryInput {
  taskDescription: string
  diff: string
  e2bResult: E2BExecutionResult
  modelUsed: string
  filePath: string
  relatedFiles: string[]
}

async function generateExecutionSummary(input: SummaryInput): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return 'Summary unavailable: ANTHROPIC_API_KEY not configured.'

  const promptLines = [
    `Task: ${input.taskDescription}`,
    `File: ${input.filePath}`,
    input.relatedFiles.length ? `Related files: ${input.relatedFiles.join(', ')}` : '',
    `\nSandbox exit code: ${input.e2bResult.exitCode}`,
    input.e2bResult.stdout ? `stdout:\n${input.e2bResult.stdout}` : '',
    input.e2bResult.stderr ? `stderr:\n${input.e2bResult.stderr}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  try {
    const anthropic = new Anthropic({ apiKey })
    const response = await anthropic.messages.create({
      model: input.modelUsed,
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: `Summarize what the code modification did and whether it succeeded:\n\n${promptLines}`,
        },
      ],
    })
    return response.content
      .filter((b): b is TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')
  } catch {
    return `Execution ${input.e2bResult.exitCode === 0 ? 'succeeded' : 'failed'} (model: ${input.modelUsed}).`
  }
}
