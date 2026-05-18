import { createAgentRuntime } from "../agent-runtime";
import { hammerOfGodCase } from "../case/hammer-of-god";
import type { ConversationTarget, RoutedMessage } from "./types";

const runtime = createAgentRuntime(hammerOfGodCase);

export const routeableTargets: ConversationTarget[] = [
  "general",
  "wilfred",
  "simeon",
  "elizabeth",
  "joe",
  "unsupported"
];

export function labelForTarget(targetId: ConversationTarget): string {
  if (targetId === "unsupported") {
    return "未配置调查对象";
  }

  return runtime.getAgent(targetId)?.name ?? "未配置调查对象";
}

export function routeMessage(message: string): RoutedMessage {
  return runtime.route(message);
}
