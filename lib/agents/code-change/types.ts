import { z } from "zod";

export const CodeChangeRequestSchema = z.object({
  id: z.string().uuid().optional(),
  filePath: z.string().min(1),
  originalContent: z.string().max(500_000),
  instruction: z.string().min(1).max(10_000),
  expectedTestCommand: z.string().optional(),
  maxRetries: z.number().int().min(0).max(3).default(1),
  userId: z.string().optional(),
});

export type CodeChangeRequest = z.infer<typeof CodeChangeRequestSchema>;

export const PlanResultSchema = z.object({
  plannedNewContent: z.string(),
  reasoning: z.string(),
});

export type PlanResult = z.infer<typeof PlanResultSchema>;

export const TestResultSchema = z.object({
  stdout: z.string(),
  stderr: z.string(),
  exitCode: z.number(),
});

export type TestResult = z.infer<typeof TestResultSchema>;

export const CodeChangeResultSchema = z.object({
  success: z.boolean(),
  filePath: z.string(),
  newContent: z.string().optional(),
  reasoning: z.string().optional(),
  testOutput: z.string().optional(),
  error: z.string().optional(),
  durationMs: z.number().optional(),
  tokensUsed: z
    .object({ input: z.number(), output: z.number() })
    .optional(),
});

export type CodeChangeResult = z.infer<typeof CodeChangeResultSchema>;

export interface CodeChangeAgentState {
  pendingChanges: CodeChangeRequest[];
  results: CodeChangeResult[];
  retryQueue: CodeChangeRequest[];
}
