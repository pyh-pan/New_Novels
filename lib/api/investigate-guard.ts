import {
  validateAgentOutput,
  type AgentRuntime,
  type RuntimeContext
} from "../agent-runtime";

export const SAFE_INVESTIGATION_FALLBACK = "我暂时无法回答这个问题。";

export function guardInvestigationOutput(
  content: string | null | undefined,
  runtime: AgentRuntime,
  context: RuntimeContext
): string {
  const validation = validateAgentOutput({ runtime, context, output: content });

  if (!validation.ok) {
    return SAFE_INVESTIGATION_FALLBACK;
  }

  return content?.trim() ?? SAFE_INVESTIGATION_FALLBACK;
}
