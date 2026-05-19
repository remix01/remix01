import { BaseAgent } from "../base/BaseAgent";
import type { AgentType, AgentMessage, AgentResponse } from "../base/types";
import { runCodeChanges } from "./graph";
import { CodeChangeRequestSchema } from "./types";

export class CodeChangeAgent extends BaseAgent {
  type: AgentType = "code_change";
  handledActions = ["applyCodeChange", "batchCodeChanges"];

  async handle(message: AgentMessage): Promise<AgentResponse> {
    const start = Date.now();
    const span = this.trace("handle");

    try {
      if (message.action === "applyCodeChange") {
        const parsed = CodeChangeRequestSchema.safeParse(message.payload);
        if (!parsed.success) {
          return {
            success: false,
            error: `Invalid payload: ${parsed.error.issues.map((i) => i.message).join(", ")}`,
            handledBy: this.type,
            durationMs: Date.now() - start,
          };
        }

        const results = await runCodeChanges([
          { ...parsed.data, userId: message.userId },
        ]);

        return {
          success: results[0]?.success ?? false,
          data: results[0],
          error: results[0]?.error,
          handledBy: this.type,
          durationMs: Date.now() - start,
        };
      }

      if (message.action === "batchCodeChanges") {
        const changes = message.payload.changes as unknown[];
        if (!Array.isArray(changes)) {
          return {
            success: false,
            error: "payload.changes must be an array",
            handledBy: this.type,
            durationMs: Date.now() - start,
          };
        }

        const validated = changes.map((c) => ({
          ...CodeChangeRequestSchema.parse(c),
          userId: message.userId,
        }));

        const results = await runCodeChanges(validated);
        const allSuccess = results.every((r) => r.success);

        return {
          success: allSuccess,
          data: { results, total: results.length, succeeded: results.filter((r) => r.success).length },
          error: allSuccess ? undefined : `${results.filter((r) => !r.success).length} change(s) failed`,
          handledBy: this.type,
          durationMs: Date.now() - start,
        };
      }

      return {
        success: false,
        error: `Unknown action: ${message.action}`,
        handledBy: this.type,
        durationMs: Date.now() - start,
      };
    } catch (error: any) {
      span.status = "error";
      span.attributes["error"] = error.message;

      return {
        success: false,
        error: error.message,
        handledBy: this.type,
        durationMs: Date.now() - start,
      };
    } finally {
      span.endTime = Date.now();
    }
  }
}
