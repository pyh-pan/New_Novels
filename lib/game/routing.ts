import { getDefaultRuntime } from "../case/default-case";
import type { createAgentRuntime } from "../agent-runtime";
import type { ConversationTarget, RoutedMessage } from "./types";

type AgentRuntime = ReturnType<typeof createAgentRuntime>;

export function getRouteableTargets(runtime: AgentRuntime = getDefaultRuntime()): ConversationTarget[] {
  return [
    ...runtime.caseFile.agents.map((agent) => agent.id),
    "unsupported"
  ];
}

export const routeableTargets: ConversationTarget[] = [
  ...getDefaultRuntime().caseFile.agents.map((agent) => agent.id),
  "unsupported"
];

export function labelForTarget(
  targetId: ConversationTarget,
  runtime: AgentRuntime = getDefaultRuntime()
): string {
  if (targetId === "unsupported") {
    return "未配置调查对象";
  }

  return runtime.getAgent(targetId)?.name ?? "未配置调查对象";
}

export function isRouteableTarget(
  targetId: string,
  runtime: AgentRuntime = getDefaultRuntime()
): boolean {
  return targetId === "unsupported" || Boolean(runtime.getAgent(targetId));
}

export function routeMessage(
  message: string,
  runtime: AgentRuntime = getDefaultRuntime()
): RoutedMessage {
  return runtime.route(message);
}
