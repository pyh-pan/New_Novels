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
  triggeredPressureRules: string[];
  currentActAgentState?: string;
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
  revealedContradictionIds: string[];
  sceneInteractionIds: string[];
  emotionalState: "calm" | "guarded" | "cornered" | "unknown";
  confidence: number;
};

export type ActGateEvaluation = {
  unlockedGateIds: string[];
  nextActId?: string;
  unlockNarratives: string[];
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
  "枪房",
  "左轮",
  "手枪",
  "访客",
  "女管家",
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
  return targetId;
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

function playerHasFact(playerState: PlayerKnowledgeState, factId: string): boolean {
  return playerState.discoveredFactIds.includes(factId);
}

function playerHasContradiction(
  playerState: PlayerKnowledgeState,
  contradictionId: string
): boolean {
  return playerState.knownContradictionIds.includes(contradictionId);
}

function moodForPressure(
  pressureLevel: number,
  thresholds: { guarded: number; cornered: number }
): AgentSession["mood"] {
  if (pressureLevel >= thresholds.cornered) {
    return "cornered";
  }
  if (pressureLevel >= thresholds.guarded) {
    return "guarded";
  }
  return "calm";
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
      const agent = agentsById.get(agentId);
      return {
        caseId: caseFile.id,
        agentId,
        conversationId: agentId,
        pressureLevel: agent?.pressureProfile.baseline ?? 0,
        revealedFactIds: [],
        lastTopics: [],
        triggeredPressureRules: [],
        currentActAgentState: "calm",
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
      revealedContradictionIds: [],
      sceneInteractionIds: [],
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
      revealedContradictionIds: Array.isArray(
        (parsed as { revealedContradictionIds?: unknown }).revealedContradictionIds
      )
        ? (parsed as { revealedContradictionIds: unknown[] }).revealedContradictionIds.filter(
            (id): id is string => typeof id === "string"
          )
        : [],
      sceneInteractionIds: Array.isArray(
        (parsed as { sceneInteractionIds?: unknown }).sceneInteractionIds
      )
        ? (parsed as { sceneInteractionIds: unknown[] }).sceneInteractionIds.filter(
            (id): id is string => typeof id === "string"
          )
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
      revealedContradictionIds: [],
      sceneInteractionIds: [],
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
  const triggeredRules =
    agent?.type === "npc"
      ? agent.pressureProfile.increaseRules.filter((rule) => {
          const hasTopic =
            rule.topics.length === 0 ||
            rule.topics.some((topic) => textContainsTopic(message, topic));
          const hasClues = rule.clueIds.every((clueId) => playerHasClue(playerState, clueId));
          const hasFacts = rule.factIds.every((factId) => playerHasFact(playerState, factId));
          const hasContradictions = rule.contradictionIds.every((contradictionId) =>
            playerHasContradiction(playerState, contradictionId)
          );

          return hasTopic && hasClues && hasFacts && hasContradictions;
        })
      : [];
  const configuredPressureDelta = triggeredRules.reduce((sum, rule) => sum + rule.delta, 0);
  const fallbackPressureDelta =
    triggeredRules.length === 0 && agent?.type === "npc" && (mentionsConfrontation || hasUsefulClue)
      ? 1
      : 0;
  const pressureDelta = configuredPressureDelta + fallbackPressureDelta;
  const pressureLevel = session.pressureLevel + pressureDelta;
  const thresholds = agent?.pressureProfile.thresholds ?? { guarded: 1, cornered: 3 };
  const mood = moodForPressure(pressureLevel, thresholds);

  return {
    ...session,
    pressureLevel,
    lastTopics: [...new Set([...session.lastTopics, ...topics])],
    triggeredPressureRules: [
      ...new Set([...session.triggeredPressureRules, ...triggeredRules.map((rule) => rule.id)])
    ],
    currentActAgentState: mood,
    mood
  };
}

export function applyAgentResponseContractToState({
  runtime,
  agentId,
  session,
  playerState,
  response
}: {
  runtime: AgentRuntime;
  agentId: string;
  session: AgentSession;
  playerState: PlayerKnowledgeState;
  response: AgentResponseContract;
}): { session: AgentSession; playerState: PlayerKnowledgeState } {
  const validFactIds = (response.revealedFactIds ?? []).filter((factId) => runtime.getFact(factId));
  const validClueIds = (response.suggestedClueIds ?? []).filter((clueId) =>
    runtime.caseFile.clues.some((clue) => clue.id === clueId)
  );
  const validContradictionIds = (response.revealedContradictionIds ?? []).filter((contradictionId) =>
    runtime.caseFile.contradictions.some((contradiction) => contradiction.id === contradictionId)
  );
  const validSceneInteractionIds = (response.sceneInteractionIds ?? []).filter((interactionId) => {
    const [sceneId, objectName] = interactionId.split(":");
    return (
      runtime.caseFile.actGates.some((gate) =>
        gate.requiredSceneInteractions.includes(interactionId)
      ) ||
      runtime.caseFile.scenes.some(
        (scene) =>
          scene.id === sceneId &&
          (!objectName || scene.interactableObjects.includes(objectName))
      )
    );
  });
  const mood =
    response.emotionalState === "unknown" ? session.mood : response.emotionalState;

  return {
    session: {
      ...session,
      revealedFactIds: [...new Set([...session.revealedFactIds, ...validFactIds])],
      mood,
      currentActAgentState: mood
    },
    playerState: {
      ...playerState,
      discoveredFactIds: [...new Set([...playerState.discoveredFactIds, ...validFactIds])],
      discoveredClueIds: [...new Set([...playerState.discoveredClueIds, ...validClueIds])],
      knownContradictionIds: [
        ...new Set([...playerState.knownContradictionIds, ...validContradictionIds])
      ],
      sceneInteractionIds: [
        ...new Set([...playerState.sceneInteractionIds, ...validSceneInteractionIds])
      ],
      confrontedAgentIds:
        agentId === "general"
          ? playerState.confrontedAgentIds
          : [...new Set([...playerState.confrontedAgentIds, agentId])]
    }
  };
}

export function evaluateActGates({
  runtime,
  playerState,
  npcInteractionIds,
  sceneInteractionIds
}: {
  runtime: AgentRuntime;
  playerState: PlayerKnowledgeState;
  npcInteractionIds: string[];
  sceneInteractionIds: string[];
}): ActGateEvaluation {
  const unlockedGates = runtime.caseFile.actGates.filter((gate) => {
    if (gate.fromActId !== playerState.currentActId) {
      return false;
    }

    return (
      gate.requiredClueIds.every((clueId) => playerHasClue(playerState, clueId)) &&
      gate.requiredFactIds.every((factId) => playerHasFact(playerState, factId)) &&
      gate.requiredContradictionIds.every((contradictionId) =>
        playerHasContradiction(playerState, contradictionId)
      ) &&
      gate.requiredNpcInteractions.every((agentId) => npcInteractionIds.includes(agentId)) &&
      gate.requiredSceneInteractions.every((interactionId) =>
        sceneInteractionIds.includes(interactionId)
      )
    );
  });

  return {
    unlockedGateIds: unlockedGates.map((gate) => gate.id),
    nextActId: unlockedGates[0]?.toActId,
    unlockNarratives: unlockedGates.map((gate) => gate.unlockNarrative)
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
        (() => {
          const meaningfulKeywords = fact.keywords.filter((keyword) => keyword.length >= 3);
          return (
            meaningfulKeywords.length > 0 &&
            meaningfulKeywords.every((keyword) => trimmed.includes(keyword))
          );
        })())
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
        .replace(/^说/u, "")
        .replace(/^确认/u, "")
        .replace(/。$/u, "")
        .trim();
      return fragment.length >= 4 && trimmed.includes(fragment);
    })
  ) {
    return { ok: false, reason: "forbidden-claim" };
  }

  return { ok: true };
}
