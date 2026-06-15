import type { CaseAgent, CaseFile } from "../case/schema";
import type {
  AdaptationQualityItem,
  SourceProfile,
  SourceSegmentationItem
} from "./source-adaptation";

export type StudioNodeType =
  | "dashboard"
  | "chapter"
  | "agent"
  | "clues"
  | "contradictions"
  | "events"
  | "acts"
  | "accusation"
  | "validation";

export type StudioTreeNode = {
  id: string;
  type: StudioNodeType;
  label: string;
  badge?: string;
  children?: StudioTreeNode[];
};

export type StudioDraftView = {
  caseId: string;
  title: string;
  sourceTitle: string;
  lifecycleStatus?: "draft" | "saved" | "published";
  sourceProfile?: SourceProfile;
  segmentation?: SourceSegmentationItem[];
  tree: StudioTreeNode[];
  stats: {
    chapters: number;
    agents: number;
    clues: number;
    contradictions: number;
    storyEvents: number;
    acts: number;
    accusationQuestions: number;
  };
  chapters: Array<{
    id: string;
    title: string;
    subtitle?: string;
    body: string;
    actId?: string;
    visibleFacts: string[];
    hiddenInvestigation: string[];
    relatedClues: string[];
    relatedContradictions: string[];
    nextGate?: string;
  }>;
  agents: Array<{
    id: string;
    name: string;
    type: CaseAgent["type"];
    role: string;
    personality: string;
    boundaries: string[];
    publicFacts: string[];
    privateFacts: string[];
    revealRules: string[];
    actMatrix: Array<{
      actTitle: string;
      canAppear: boolean;
      visibleClues: string[];
      lockedFacts: string[];
    }>;
  }>;
  clues: Array<{
    id: string;
    title: string;
    text: string;
    source: string;
    unlockHints: string[];
    supportsFacts: string[];
  }>;
  contradictions: Array<{
    id: string;
    title: string;
    facts: string[];
    clues: string[];
    agents: string[];
  }>;
  storyEvents: Array<{
    id: string;
    kind: CaseFile["storyEvents"][number]["kind"];
    title: string;
    description: string;
    timing: CaseFile["storyEvents"][number]["timing"];
    trigger: string[];
    effects: string[];
    designRationale: string;
  }>;
  acts: Array<{
    id: string;
    title: string;
    availableAgents: string[];
    visibleClues: string[];
    lockedFacts: string[];
    gatesOut: Array<{
      id: string;
      toActId: string;
      requiredClues: string[];
      requiredFacts: string[];
      requiredContradictions: string[];
      requiredNpcInteractions: string[];
      unlockNarrative: string;
    }>;
  }>;
  accusation: Array<{
    id: string;
    prompt: string;
    acceptedAnswers: string[];
    explanation: string;
    supportingEvidence: string[];
  }>;
  validation: Array<{
    severity: "fatal" | "warning" | "suggestion";
    title: string;
    detail: string;
  }>;
};

function textForIds(ids: string[], lookup: Map<string, string>) {
  return ids.map((id) => lookup.get(id) ?? id);
}

function hiddenFactsForChapter(caseFile: CaseFile, actId?: string) {
  return caseFile.facts
    .filter((fact) => fact.actId === actId && fact.visibility !== "public")
    .map((fact) => fact.text);
}

export function createStudioDraftView(caseFile: CaseFile): StudioDraftView {
  return createStudioDraftViewWithAdaptation(caseFile);
}

export function createStudioDraftViewWithAdaptation(
  caseFile: CaseFile,
  adaptation?: {
    lifecycleStatus?: StudioDraftView["lifecycleStatus"];
    sourceProfile?: SourceProfile;
    segmentation?: SourceSegmentationItem[];
    qualityReport?: AdaptationQualityItem[];
  }
): StudioDraftView {
  const factText = new Map(caseFile.facts.map((fact) => [fact.id, fact.text]));
  const clueTitle = new Map(caseFile.clues.map((clue) => [clue.id, clue.title]));
  const agentName = new Map(caseFile.agents.map((agent) => [agent.id, agent.name]));
  const adaptationTree: StudioTreeNode[] = adaptation?.sourceProfile
    ? [
        {
          id: "source-profile",
          type: "validation",
          label: "原文画像"
        },
        {
          id: "segmentation",
          type: "validation",
          label: "改写分段"
        }
      ]
    : [];

  return {
    caseId: caseFile.id,
    title: caseFile.title,
    sourceTitle: caseFile.source.title,
    lifecycleStatus: adaptation?.lifecycleStatus,
    sourceProfile: adaptation?.sourceProfile,
    segmentation: adaptation?.segmentation,
    tree: [
      {
        id: "dashboard",
        type: "dashboard",
        label: "案件控制台"
      },
      ...adaptationTree,
      {
        id: "chapters",
        type: "chapter",
        label: "故事章节",
        children: caseFile.chapters.map((chapter, index) => ({
          id: chapter.id,
          type: "chapter",
          label: `${index + 1}. ${chapter.subtitle ?? chapter.title}`
        }))
      },
      {
        id: "agents",
        type: "agent",
        label: "角色",
        children: caseFile.agents.map((agent) => ({
          id: agent.id,
          type: "agent",
          label: agent.name
        }))
      },
      { id: "clues", type: "clues", label: "线索" },
      { id: "contradictions", type: "contradictions", label: "矛盾" },
      { id: "events", type: "events", label: "故事事件" },
      { id: "acts", type: "acts", label: "多幕推进" },
      { id: "accusation", type: "accusation", label: "最终指认" },
      { id: "validation", type: "validation", label: "校验报告" }
    ],
    stats: {
      chapters: caseFile.chapters.length,
      agents: caseFile.agents.length,
      clues: caseFile.clues.length,
      contradictions: caseFile.contradictions.length,
      storyEvents: caseFile.storyEvents.length,
      acts: caseFile.acts.length,
      accusationQuestions: caseFile.accusation.questions.length
    },
    chapters: caseFile.chapters.map((chapter, index) => {
      const act = caseFile.acts[index];
      const relatedClues = caseFile.clues
        .filter((clue) => clue.unlock?.type === "story" || clue.source.includes(chapter.title))
        .map((clue) => clue.title);
      const relatedContradictions = caseFile.contradictions
        .filter((contradiction) =>
          contradiction.clueIds.some((clueId) => relatedClues.includes(clueTitle.get(clueId) ?? ""))
        )
        .map((contradiction) => contradiction.title);

      return {
        id: chapter.id,
        title: chapter.title,
        subtitle: chapter.subtitle,
        body: chapter.body,
        actId: act?.id,
        visibleFacts: textForIds(act?.visibleClueIds ?? [], clueTitle),
        hiddenInvestigation: hiddenFactsForChapter(caseFile, act?.id),
        relatedClues,
        relatedContradictions,
        nextGate: caseFile.actGates.find((gate) => gate.fromActId === act?.id)?.unlockNarrative
      };
    }),
    agents: caseFile.agents.map((agent) => ({
      id: agent.id,
      name: agent.name,
      type: agent.type,
      role: agent.role,
      personality: [
        agent.personality.speechStyle,
        agent.personality.emotionalBaseline,
        agent.personality.stressResponse
      ].join(" / "),
      boundaries:
        agent.type === "npc"
          ? [
              ...agent.boundaries.hides.map((item) => `隐瞒：${item}`),
              ...agent.boundaries.liesAbout.map((item) => `撒谎：${item}`),
              ...agent.boundaries.forbiddenClaims.map((item) => `禁止：${item}`)
            ]
          : agent.forbiddenClaims.map((item) => `禁止：${item}`),
      publicFacts: agent.knowledge.publicFacts,
      privateFacts: agent.knowledge.privateFacts,
      revealRules: agent.revealRules.map((rule) => `${rule.fact}（${rule.revealMode}）`),
      actMatrix: caseFile.acts.map((act) => ({
        actTitle: act.title,
        canAppear: act.availableAgentIds.includes(agent.id),
        visibleClues: textForIds(act.visibleClueIds, clueTitle),
        lockedFacts: textForIds(act.lockedFactIds, factText)
      }))
    })),
    clues: caseFile.clues.map((clue) => ({
      id: clue.id,
      title: clue.title,
      text: clue.text,
      source: clue.source,
      unlockHints: clue.unlockHints,
      supportsFacts: textForIds(clue.unlock?.factIds ?? clue.unlockHints, factText)
    })),
    contradictions: caseFile.contradictions.map((contradiction) => ({
      id: contradiction.id,
      title: contradiction.title,
      facts: textForIds(contradiction.factIds, factText),
      clues: textForIds(contradiction.clueIds, clueTitle),
      agents: textForIds(contradiction.agentIds, agentName)
    })),
    storyEvents: caseFile.storyEvents.map((event) => ({
      id: event.id,
      kind: event.kind,
      title: event.title,
      description: event.description,
      timing: event.timing,
      trigger: [
        event.trigger.requiresAct ? `剧情幕：${event.trigger.requiresAct}` : undefined,
        event.trigger.agentId ? `触发对象：${agentName.get(event.trigger.agentId) ?? event.trigger.agentId}` : undefined,
        ...event.trigger.topics.map((topic) => `话题：${topic}`),
        ...textForIds(event.trigger.requiredClueIds, clueTitle).map((item) => `需要线索：${item}`),
        ...textForIds(event.trigger.requiredFactIds, factText).map((item) => `需要事实：${item}`)
      ].filter((item): item is string => Boolean(item)),
      effects: [
        ...textForIds(event.effects.revealedClueIds, clueTitle).map((item) => `揭示线索：${item}`),
        ...textForIds(event.effects.revealedFactIds, factText).map((item) => `揭示事实：${item}`),
        ...event.effects.targetAgentIds.map((agentId) => `影响角色：${agentName.get(agentId) ?? agentId}`),
        event.effects.nextActId ? `进入剧情幕：${event.effects.nextActId}` : undefined,
        `叙事：${event.effects.narrative}`
      ].filter((item): item is string => Boolean(item)),
      designRationale: event.designRationale
    })),
    acts: caseFile.acts.map((act) => ({
      id: act.id,
      title: act.title,
      availableAgents: textForIds(act.availableAgentIds, agentName),
      visibleClues: textForIds(act.visibleClueIds, clueTitle),
      lockedFacts: textForIds(act.lockedFactIds, factText),
      gatesOut: caseFile.actGates
        .filter((gate) => gate.fromActId === act.id)
        .map((gate) => ({
          id: gate.id,
          toActId: gate.toActId,
          requiredClues: textForIds(gate.requiredClueIds, clueTitle),
          requiredFacts: textForIds(gate.requiredFactIds, factText),
          requiredContradictions: gate.requiredContradictionIds,
          requiredNpcInteractions: textForIds(gate.requiredNpcInteractions, agentName),
          unlockNarrative: gate.unlockNarrative
        }))
    })),
    accusation: caseFile.accusation.questions.map((question) => ({
      id: question.id,
      prompt: question.prompt,
      acceptedAnswers: question.acceptedAnswers,
      explanation: question.explanation,
      supportingEvidence: textForIds(caseFile.truth.decisiveEvidence, factText)
    })),
    validation: [
      ...(adaptation?.qualityReport ?? []).map((item) => ({
        severity: item.severity,
        title: item.title,
        detail: item.detail
      })),
      {
        severity: "suggestion",
        title: "封面资源",
        detail: "当前案件使用模板封面。发布版本可以在 assets/cover.* 中补充封面图。"
      },
      {
        severity: "warning",
        title: "人工审校",
        detail: "发布前应人工确认章节文本仍具文学性，且 investigation-hide 内容没有提前出现在故事栏。"
      }
    ]
  };
}
