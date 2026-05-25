import { getDefaultRuntime } from "../case/default-case";
import type { ConversationTarget, RoutedMessage } from "./types";

const runtime = getDefaultRuntime();

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
