import type {
  AgentRelationship,
  CaseAgent,
  CaseFact,
  CaseFile,
  PlayerKnowledgeState,
  RevealRule
} from "../case/schema";
import type { ConversationTarget, RoutedMessage } from "../game/types";

export type AgentSession = {
  caseId: string;
  agentId: string;
  conversationId: string;
  pressureLevel: number;
  revealedFactIds: string[];
  lastTopics: string[];
  mood: "calm" | "guarded" | "cornered";
};

export type RuntimeContext = {
  caseId: string;
  agent: CaseAgent;
  promptVersion: string;
  currentActId: string;
  allowedFactIds: string[];
  hiddenFactIds: string[];
  privateFactIds: string[];
  allowedFacts: CaseFact[];
  revealedRules: RevealRule[];
};

export type PlayerKnowledgeGraph = {
  facts: string[];
  clues: string[];
  testimonies: string[];
  contradictions: string[];
  hypotheses: string[];
};

export type AgentResponseContract = {
  reply: string;
  revealedFactIds: string[];
  suggestedClueIds: string[];
  emotionalState: "calm" | "guarded" | "cornered" | "unknown";
  confidence: number;
};

export type AgentRuntime = {
  caseFile: CaseFile;
  agentsById: Map<string, CaseAgent>;
  factsById: Map<string, CaseFact>;
  aliasesByName: Map<string, string>;
  route: (message: string) => RoutedMessage;
  getAgent: (agentId: string) => CaseAgent | undefined;
  getFact: (factId: string) => CaseFact | undefined;
  getSession: (agentId: string) => AgentSession;
};

const generalKeywords = [
  "现场",
  "线索",
  "物证",
  "血迹",
  "锤子",
  "小锤",
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

const fabricatedEvidenceStrings = [
  "新的书信",
  "一封书信",
  "脚印",
  "新证物",
  "新的证物",
  "新证据",
  "新的证据",
  "另有目击者",
  "隐藏的目击者"
];

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function labelForAgent(caseFile: CaseFile, targetId: string): string {
  if (targetId === "unsupported") {
    return "未配置调查对象";
  }

  return caseFile.agents.find((agent) => agent.id === targetId)?.name ?? "未配置调查对象";
}

function toConversationTarget(targetId: string): ConversationTarget {
  if (
    targetId === "general" ||
    targetId === "wilfred" ||
    targetId === "simeon" ||
    targetId === "elizabeth" ||
    targetId === "joe" ||
    targetId === "unsupported"
  ) {
    return targetId;
  }

  return "unsupported";
}

function textContainsTopic(text: string, topic: string): boolean {
  return normalize(text).includes(normalize(topic));
}

function playerHasClue(playerState: PlayerKnowledgeState, clueId: string): boolean {
  return playerState.discoveredClueIds.includes(clueId);
}

function playerHasAnyTopic(playerState: PlayerKnowledgeState, topics: string[]): boolean {
  return playerState.askedTopics.some((asked) =>
    topics.some((topic) => textContainsTopic(asked, topic))
  );
}

function extractTopics(caseFile: CaseFile, message: string): string[] {
  const candidates = new Set<string>([
    ...generalKeywords,
    ...caseFile.clues.flatMap((clue) => clue.unlockHints),
    ...caseFile.facts.flatMap((fact) => fact.keywords),
    ...caseFile.agents.flatMap((agent) => [agent.name, ...agent.aliases])
  ]);

  return [...candidates].filter((topic) => textContainsTopic(message, topic));
}

export function createAgentRuntime(caseFile: CaseFile): AgentRuntime {
  const agentsById = new Map(caseFile.agents.map((agent) => [agent.id, agent]));
  const factsById = new Map(caseFile.facts.map((fact) => [fact.id, fact]));
  const aliasesByName = new Map<string, string>();

  for (const agent of caseFile.agents) {
    aliasesByName.set(normalize(agent.name), agent.id);
    aliasesByName.set(normalize(agent.id), agent.id);
    for (const alias of agent.aliases) {
      aliasesByName.set(normalize(alias), agent.id);
    }
  }

  return {
    caseFile,
    agentsById,
    factsById,
    aliasesByName,
    route(message: string): RoutedMessage {
      const normalized = normalize(message);
      let match: { agentId: string; aliasLength: number } | undefined;

      for (const [alias, agentId] of aliasesByName) {
        if (
          normalized.includes(alias) &&
          agentId !== "general" &&
          (!match || alias.length > match.aliasLength)
        ) {
          match = { agentId, aliasLength: alias.length };
        }
      }

      if (match) {
        return {
          targetId: toConversationTarget(match.agentId),
          label: labelForAgent(caseFile, match.agentId)
        };
      }

      if (generalKeywords.some((keyword) => normalized.includes(normalize(keyword)))) {
        return { targetId: "general", label: labelForAgent(caseFile, "general") };
      }

      return { targetId: "unsupported", label: labelForAgent(caseFile, "unsupported") };
    },
    getAgent(agentId: string) {
      return agentsById.get(agentId);
    },
    getFact(factId: string) {
      return factsById.get(factId);
    },
    getSession(agentId: string): AgentSession {
      return {
        caseId: caseFile.id,
        agentId,
        conversationId: agentId,
        pressureLevel: 0,
        revealedFactIds: [],
        lastTopics: [],
        mood: "calm"
      };
    }
  };
}

export function buildPlayerKnowledgeGraph(
  playerState: PlayerKnowledgeState
): PlayerKnowledgeGraph {
  return {
    facts: [...playerState.discoveredFactIds],
    clues: [...playerState.discoveredClueIds],
    testimonies: [...playerState.heardTestimonyIds],
    contradictions: [...playerState.knownContradictionIds],
    hypotheses: [...playerState.hypotheses]
  };
}

export function getAgentRelationships(
  runtime: AgentRuntime,
  agentId: string
): AgentRelationship[] {
  return runtime.caseFile.relationships.filter((relationship) => relationship.from === agentId);
}

export function parseAgentResponseContract(content: string | null | undefined): AgentResponseContract {
  const fallback = content?.trim() ?? "";

  if (!fallback.startsWith("{")) {
    return {
      reply: fallback,
      revealedFactIds: [],
      suggestedClueIds: [],
      emotionalState: "unknown",
      confidence: 1
    };
  }

  try {
    const parsed = JSON.parse(fallback) as Partial<AgentResponseContract>;
    return {
      reply: typeof parsed.reply === "string" ? parsed.reply.trim() : fallback,
      revealedFactIds: Array.isArray(parsed.revealedFactIds)
        ? parsed.revealedFactIds.filter((id): id is string => typeof id === "string")
        : [],
      suggestedClueIds: Array.isArray(parsed.suggestedClueIds)
        ? parsed.suggestedClueIds.filter((id): id is string => typeof id === "string")
        : [],
      emotionalState:
        parsed.emotionalState === "calm" ||
        parsed.emotionalState === "guarded" ||
        parsed.emotionalState === "cornered"
          ? parsed.emotionalState
          : "unknown",
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 1
    };
  } catch {
    return {
      reply: fallback,
      revealedFactIds: [],
      suggestedClueIds: [],
      emotionalState: "unknown",
      confidence: 1
    };
  }
}

export function evaluateRevealRules({
  runtime,
  agentId,
  session,
  playerState
}: {
  runtime: AgentRuntime;
  agentId: string;
  session: AgentSession;
  playerState: PlayerKnowledgeState;
}): RevealRule[] {
  const agent = runtime.getAgent(agentId);
  if (!agent) {
    return [];
  }

  return agent.revealRules.filter((rule) => {
    const allRequiredClues = [...rule.requiresClues, ...rule.requiresAllClues];
    const hasAllClues = allRequiredClues.every((clueId) => playerHasClue(playerState, clueId));
    const hasAnyClue =
      rule.requiresAnyClues.length === 0 ||
      rule.requiresAnyClues.some((clueId) => playerHasClue(playerState, clueId));
    const topics = rule.requiresTopics ?? [];
    const hasTopic =
      topics.length === 0 ||
      topics.some((topic) => session.lastTopics.some((seen) => textContainsTopic(seen, topic))) ||
      playerHasAnyTopic(playerState, topics);
    const hasPressure =
      rule.requiresPressureAtLeast === undefined ||
      session.pressureLevel >= rule.requiresPressureAtLeast;
    const hasAct = !rule.requiresAct || playerState.currentActId === rule.requiresAct;
    const hasContradictions = rule.requiresContradictions.every((contradictionId) =>
      playerState.knownContradictionIds.includes(contradictionId)
    );

    return hasAllClues && hasAnyClue && hasTopic && hasPressure && hasAct && hasContradictions;
  });
}

export function buildRuntimeContext({
  runtime,
  agentId,
  playerState,
  session = runtime.getSession(agentId)
}: {
  runtime: AgentRuntime;
  agentId: string;
  playerState: PlayerKnowledgeState;
  session?: AgentSession;
}): RuntimeContext {
  const agent = runtime.getAgent(agentId);
  if (!agent) {
    throw new Error(`Unknown agent: ${agentId}`);
  }

  const revealedRules = evaluateRevealRules({ runtime, agentId, session, playerState });
  const revealedFactIds = new Set([
    ...session.revealedFactIds,
    ...revealedRules.map((rule) => rule.factId)
  ]);
  const allowedFactIds = new Set<string>();
  const privateFactIds = new Set<string>();
  const hiddenFactIds = new Set<string>();

  for (const fact of runtime.caseFile.facts) {
    const ownedByAgent = fact.ownerAgentIds.includes(agentId);
    const relatedClueUnlocked = fact.relatedClueIds.some((clueId) =>
      playerState.discoveredClueIds.includes(clueId)
    );
    const directlyUnlocked =
      playerState.discoveredFactIds.includes(fact.id) || revealedFactIds.has(fact.id);

    if (fact.visibility === "truth" || fact.visibility === "private") {
      hiddenFactIds.add(fact.id);
      if (ownedByAgent) {
        privateFactIds.add(fact.id);
      }
      if (revealedFactIds.has(fact.id) && fact.visibility !== "truth") {
        allowedFactIds.add(fact.id);
      }
      continue;
    }

    if (agent.type === "general") {
      if (fact.visibility === "public" || relatedClueUnlocked || directlyUnlocked) {
        allowedFactIds.add(fact.id);
      } else {
        hiddenFactIds.add(fact.id);
      }
      continue;
    }

    if (ownedByAgent && (fact.visibility === "public" || relatedClueUnlocked || directlyUnlocked)) {
      allowedFactIds.add(fact.id);
    } else {
      hiddenFactIds.add(fact.id);
    }
  }

  return {
    caseId: runtime.caseFile.id,
    agent,
    promptVersion: agent.promptVersion,
    currentActId: playerState.currentActId,
    allowedFactIds: [...allowedFactIds],
    hiddenFactIds: [...hiddenFactIds],
    privateFactIds: [...privateFactIds],
    allowedFacts: [...allowedFactIds].map((factId) => runtime.factsById.get(factId)).filter(Boolean) as CaseFact[],
    revealedRules
  };
}

export function updateSessionForUserMessage({
  runtime,
  session,
  message,
  playerState
}: {
  runtime: AgentRuntime;
  session: AgentSession;
  message: string;
  playerState: PlayerKnowledgeState;
}): AgentSession {
  const topics = extractTopics(runtime.caseFile, message);
  const agent = runtime.getAgent(session.agentId);
  const confrontationTerms = ["矛盾", "撒谎", "说谎", "不匹配", "为什么", "但"];
  const mentionsConfrontation = confrontationTerms.some((term) => message.includes(term));
  const hasUsefulClue = playerState.discoveredClueIds.length > 0;
  const pressureDelta = agent?.type === "npc" && (mentionsConfrontation || hasUsefulClue) ? 1 : 0;
  const pressureLevel = session.pressureLevel + pressureDelta;

  return {
    ...session,
    pressureLevel,
    lastTopics: [...new Set([...session.lastTopics, ...topics])],
    mood: pressureLevel >= 3 ? "cornered" : pressureLevel > 0 ? "guarded" : session.mood
  };
}

export function validateAgentOutput({
  runtime,
  context,
  output
}: {
  runtime: AgentRuntime;
  context: RuntimeContext;
  output: string | null | undefined;
}): { ok: boolean; reason?: string } {
  const trimmed = output?.trim() ?? "";

  if (trimmed.length === 0 || trimmed.length > 600) {
    return { ok: false, reason: "empty-or-too-long" };
  }

  if (fabricatedEvidenceStrings.some((fragment) => trimmed.includes(fragment))) {
    return { ok: false, reason: "fabricated-evidence" };
  }

  const allowed = new Set(context.allowedFactIds);
  const blockedFacts = runtime.caseFile.facts.filter(
    (fact) =>
      !allowed.has(fact.id) &&
      (fact.visibility === "truth" || fact.visibility === "private") &&
      (trimmed.includes(fact.text) ||
        fact.keywords.filter((keyword) => keyword.length >= 3).every((keyword) =>
          trimmed.includes(keyword)
        ))
  );

  if (blockedFacts.length > 0) {
    return { ok: false, reason: "disallowed-fact" };
  }

  const forbiddenClaims =
    context.agent.type === "general"
      ? context.agent.forbiddenClaims
      : context.agent.boundaries.forbiddenClaims;

  if (
    forbiddenClaims.some((claim) => {
      const fragment = claim
        .replace(/^不得/u, "")
        .replace(/^直接/u, "")
        .replace(/^主动/u, "")
        .replace(/。$/u, "")
        .trim();
      return fragment.length >= 4 && trimmed.includes(fragment);
    })
  ) {
    return { ok: false, reason: "forbidden-claim" };
  }

  return { ok: true };
}
