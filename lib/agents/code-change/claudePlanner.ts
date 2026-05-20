import Anthropic from "@anthropic-ai/sdk";
import { logAgentUsage } from "../usage-logging";
import type { CodeChangeRequest, PlanResult } from "./types";
import { withRetry } from "./retry";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = "claude-sonnet-4-6";

const SYSTEM_PROMPT = `You are an expert Next.js 15 / TypeScript / Tailwind 4 developer for the LiftGO marketplace.
You receive a file and an instruction describing what to change.

Rules:
- Return the ENTIRE new file content after applying the change — not a diff.
- Preserve all existing imports, exports, and functionality that the instruction doesn't ask to change.
- Follow existing code style (indentation, naming conventions).
- Never introduce security vulnerabilities (XSS, injection, etc.).
- If the instruction is unclear or contradictory, make the safest reasonable interpretation and note it in reasoning.`;

export async function planCodeChange(
  request: CodeChangeRequest
): Promise<PlanResult & { tokensUsed: { input: number; output: number } }> {
  const userPrompt = `File: ${request.filePath}

Current content:
\`\`\`
${request.originalContent}
\`\`\`

Instruction: ${request.instruction}

Respond with JSON:
{
  "plannedNewContent": "the entire new file content",
  "reasoning": "short explanation of what you changed and why"
}`;

  const response = await withRetry(
    () =>
      anthropic.messages.create({
        model: MODEL,
        max_tokens: 8192,
        system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: userPrompt }],
      }),
    { maxAttempts: 2, baseDelayMs: 1000 }
  );

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Empty response from Claude planner");
  }

  const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("No JSON found in Claude planner response");
  }

  const parsed = JSON.parse(jsonMatch[0]) as PlanResult;
  if (!parsed.plannedNewContent || typeof parsed.plannedNewContent !== "string") {
    throw new Error("Invalid plannedNewContent in Claude response");
  }

  const tokensUsed = {
    input: response.usage.input_tokens,
    output: response.usage.output_tokens,
  };

  const costUsd =
    (tokensUsed.input * 3) / 1_000_000 + (tokensUsed.output * 15) / 1_000_000;
  const cached =
    (response.usage as any).cache_read_input_tokens > 0;

  if (request.userId) {
    logAgentUsage({
      userId: request.userId,
      modelUsed: MODEL,
      tokensInput: tokensUsed.input,
      tokensOutput: tokensUsed.output,
      costUsd,
      responseCached: cached,
      agentType: "code_change_planner",
    }).catch((err) =>
      console.error("[claudePlanner] usage logging failed:", err)
    );
  }

  return {
    plannedNewContent: parsed.plannedNewContent,
    reasoning: parsed.reasoning ?? "",
    tokensUsed,
  };
}
