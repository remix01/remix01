import { planCodeChange } from "./claudePlanner";
import { applyCodeChange } from "./morphApply";
import { testInE2B } from "./e2bRunner";
import {
  CodeChangeRequestSchema,
  type CodeChangeAgentState,
  type CodeChangeResult,
  type CodeChangeRequest,
} from "./types";

const MAX_FILE_SIZE = 500_000;

async function processOne(req: CodeChangeRequest): Promise<CodeChangeResult> {
  const start = Date.now();

  const parsed = CodeChangeRequestSchema.safeParse(req);
  if (!parsed.success) {
    return {
      success: false,
      filePath: req.filePath ?? "unknown",
      error: `Validation: ${parsed.error.issues.map((i) => i.message).join(", ")}`,
      durationMs: Date.now() - start,
    };
  }

  if (req.originalContent.length > MAX_FILE_SIZE) {
    return {
      success: false,
      filePath: req.filePath,
      error: `File too large (${req.originalContent.length} chars, max ${MAX_FILE_SIZE})`,
      durationMs: Date.now() - start,
    };
  }

  const { plannedNewContent, reasoning, tokensUsed } = await planCodeChange(req);

  if (plannedNewContent.trim() === req.originalContent.trim()) {
    return {
      success: true,
      filePath: req.filePath,
      newContent: req.originalContent,
      reasoning: "No changes needed per Claude analysis",
      durationMs: Date.now() - start,
      tokensUsed,
    };
  }

  const finalContent = await applyCodeChange(
    req.filePath,
    req.originalContent,
    plannedNewContent
  );

  let testOutput: string | undefined;
  if (req.expectedTestCommand) {
    const testResult = await testInE2B(
      req.filePath,
      finalContent,
      req.expectedTestCommand
    );
    testOutput = `exit=${testResult.exitCode}\nstdout: ${testResult.stdout}\nstderr: ${testResult.stderr}`;

    if (testResult.exitCode === -1) {
      throw new Error("E2B_API_KEY not configured — cannot run requested tests");
    }
    if (testResult.exitCode !== 0) {
      throw new Error(`Tests failed (exit ${testResult.exitCode}): ${testResult.stderr.slice(0, 500)}`);
    }
  }

  return {
    success: true,
    filePath: req.filePath,
    newContent: finalContent,
    reasoning,
    testOutput,
    durationMs: Date.now() - start,
    tokensUsed,
  };
}

export async function codeChangeNode(
  state: CodeChangeAgentState
): Promise<Partial<CodeChangeAgentState>> {
  const newResults: CodeChangeResult[] = [];
  const retryQueue: CodeChangeRequest[] = [];

  for (const req of state.pendingChanges) {
    try {
      const result = await processOne(req);
      newResults.push(result);
    } catch (error: any) {
      const maxRetries = req.maxRetries ?? 1;
      const currentRetryCount = (state.retryQueue ?? []).filter(
        (r) => r.filePath === req.filePath
      ).length;

      if (currentRetryCount < maxRetries) {
        console.warn(
          `[codeChangeNode] Retrying ${req.filePath} (attempt ${currentRetryCount + 1}/${maxRetries}): ${error.message}`
        );
        retryQueue.push(req);
      } else {
        newResults.push({
          success: false,
          filePath: req.filePath,
          error: error.message,
        });
      }
    }
  }

  return {
    results: [...(state.results ?? []), ...newResults],
    pendingChanges: retryQueue.length > 0 ? retryQueue : [],
    retryQueue: [...(state.retryQueue ?? []), ...retryQueue],
  };
}
