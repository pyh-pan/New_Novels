import { hammerOfGodCase } from "../case/hammer-of-god";
import type { ConversationTarget, NpcConversationTarget, RoutedMessage } from "./types";

const generalKeywords = [
  "现场",
  "线索",
  "物证",
  "血迹",
  "锤子",
  "尸体",
  "钟楼",
  "伤口",
  "指纹",
  "拖拽",
  "位置",
  "关系",
  "推理",
  "矛盾"
];

interface NpcRouteRule {
  targetId: NpcConversationTarget;
  label: string;
  keywords: string[];
}

const npcTargetIds = new Set<NpcConversationTarget>(["wilfred", "simeon", "elizabeth", "joe"]);

const npcAliases = {
  wilfred: ["威尔弗里德", "牧师"],
  simeon: ["西米恩", "铁匠"],
  elizabeth: ["伊丽莎白", "铁匠妻子"],
  joe: ["疯乔"]
} satisfies Record<NpcConversationTarget, string[]>;

export const routeableTargets: ConversationTarget[] = [
  "general",
  "wilfred",
  "simeon",
  "elizabeth",
  "joe",
  "unsupported"
];

export function labelForTarget(targetId: ConversationTarget): string {
  if (targetId === "general") {
    return "调查助手";
  }

  if (targetId === "unsupported") {
    return "未配置调查对象";
  }

  return (
    hammerOfGodCase.agents.find((agent) => agent.id === targetId)?.name ??
    "未配置调查对象"
  );
}

function isNpcTargetId(value: string): value is NpcConversationTarget {
  return npcTargetIds.has(value as NpcConversationTarget);
}

const npcRules: NpcRouteRule[] = hammerOfGodCase.agents.flatMap((agent) => {
  if (!isNpcTargetId(agent.id)) {
    return [];
  }

  return [
    {
      targetId: agent.id,
      label: agent.name,
      keywords: [agent.name, ...npcAliases[agent.id]]
    }
  ];
});

export function routeMessage(message: string): RoutedMessage {
  const normalized = message.trim().toLowerCase();
  let bestMatch: { rule: NpcRouteRule; keywordLength: number } | undefined;

  for (const rule of npcRules) {
    for (const keyword of rule.keywords) {
      const normalizedKeyword = keyword.toLowerCase();

      if (
        normalized.includes(normalizedKeyword) &&
        (!bestMatch || normalizedKeyword.length > bestMatch.keywordLength)
      ) {
        bestMatch = { rule, keywordLength: normalizedKeyword.length };
      }
    }
  }

  if (bestMatch) {
    return { targetId: bestMatch.rule.targetId, label: bestMatch.rule.label };
  }

  if (generalKeywords.some((keyword) => normalized.includes(keyword.toLowerCase()))) {
    return { targetId: "general", label: labelForTarget("general") };
  }

  return { targetId: "unsupported", label: labelForTarget("unsupported") };
}
