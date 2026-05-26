export type ConversationTarget = string;
export type NpcConversationTarget = Exclude<ConversationTarget, "general" | "unsupported">;

export interface RoutedMessage {
  targetId: ConversationTarget;
  label: string;
  confidence?: number;
  reason?: string;
}

export interface AccusationCheckResult {
  correct: boolean;
  explanation?: string;
}
