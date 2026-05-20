import { StateGraph, Annotation, END } from "@langchain/langgraph";
import { codeChangeNode } from "./codeChangeNode";
import type { CodeChangeRequest, CodeChangeResult } from "./types";

const CodeChangeAnnotation = Annotation.Root({
  pendingChanges: Annotation<CodeChangeRequest[]>({
    reducer: (_: CodeChangeRequest[], update: CodeChangeRequest[]) => update,
    default: (): CodeChangeRequest[] => [],
  }),
  results: Annotation<CodeChangeResult[]>({
    reducer: (_: CodeChangeResult[], update: CodeChangeResult[]) => update,
    default: (): CodeChangeResult[] => [],
  }),
  retryQueue: Annotation<CodeChangeRequest[]>({
    reducer: (_: CodeChangeRequest[], update: CodeChangeRequest[]) => update,
    default: (): CodeChangeRequest[] => [],
  }),
});

type CodeChangeState = typeof CodeChangeAnnotation.State;

function shouldRetry(state: CodeChangeState): "apply_code_changes" | typeof END {
  if (state.pendingChanges.length > 0) {
    return "apply_code_changes";
  }
  return END;
}

const workflow = new StateGraph(CodeChangeAnnotation)
  .addNode("apply_code_changes", codeChangeNode)
  .addConditionalEdges("apply_code_changes", shouldRetry)
  .addEdge("__start__", "apply_code_changes");

export const codeChangeGraph = workflow.compile();

export async function runCodeChanges(
  changes: CodeChangeRequest[]
): Promise<CodeChangeResult[]> {
  const finalState = await codeChangeGraph.invoke({
    pendingChanges: changes,
    results: [],
    retryQueue: [],
  });
  return finalState.results;
}
