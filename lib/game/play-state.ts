import type { ConversationMessage } from "../../components/ConversationModule";
import type { NotebookNote, NoteFilter } from "../../components/NotebookDrawer";
import type { AgentSession } from "../agent-runtime";
import type { CaseAgent, PlayerKnowledgeState, StoryChapter } from "../case/schema";

export const PLAY_STATE_VERSION = 1;
export const PLAY_STATE_STORAGE_KEY = "new-novels.play-state.v1";
const LEGACY_GENERAL_OPENING_MESSAGE =
  "我会基于你已掌握的信息协助调查；如果问题更适合某位人物，我会把对话转到对应 NPC。";

export type ConversationTarget = string;

export type Conversation = {
  id: string;
  targetId: ConversationTarget;
  title: string;
  subtitle?: string;
  messages: ConversationMessage[];
  isExpanded: boolean;
};

export type MobileTab = "story" | "investigation" | "notebook";

export type LocalPlayState = {
  version: number;
  caseId: string;
  currentChapterId: string;
  conversations: Conversation[];
  agentSessions: Record<string, AgentSession>;
  notes: NotebookNote[];
  playerState: PlayerKnowledgeState;
  ui: {
    activeNotebookFilter: NoteFilter;
    activeConversationId?: string;
    investigationOpen?: boolean;
    investigationWidth?: number;
    notebookOpen?: boolean;
    notebookWidth?: number;
    mobileTab?: MobileTab;
  };
  savedAt: string;
};

export const initialPlayerState: PlayerKnowledgeState = {
  currentActId: "act-opening",
  discoveredClueIds: [],
  discoveredFactIds: [],
  heardTestimonyIds: [],
  knownContradictionIds: [],
  sceneInteractionIds: [],
  confrontedAgentIds: [],
  askedTopics: [],
  hypotheses: []
};

export const initialConversations: Conversation[] = [
  {
    id: "general",
    targetId: "general",
    title: "通用调查助手",
    subtitle: "默认接收未指定对象的问题，整理已知线索",
    isExpanded: true,
    messages: []
  },
  {
    id: "japp",
    targetId: "japp",
    title: "贾普探长",
    subtitle: "负责现场调查的苏格兰场探长",
    isExpanded: false,
    messages: []
  },
  {
    id: "middleton",
    targetId: "middleton",
    title: "米德尔顿太太",
    subtitle: "猎人小屋新来的女管家证词模块",
    isExpanded: false,
    messages: []
  },
  {
    id: "poirot",
    targetId: "poirot",
    title: "赫尔克里·波洛",
    subtitle: "留在伦敦远程指挥调查的侦探",
    isExpanded: false,
    messages: []
  },
  {
    id: "roger",
    targetId: "roger",
    title: "罗杰·哈弗林",
    subtitle: "死者的亲属，声称案发时已回到伦敦",
    isExpanded: false,
    messages: []
  },
  {
    id: "zoe",
    targetId: "zoe",
    title: "佐伊·哈弗林",
    subtitle: "罗杰的妻子，案发时留在猎人小屋",
    isExpanded: false,
    messages: []
  }
];

export type ConversationAgentSummary = Pick<CaseAgent, "id" | "name" | "role" | "type">;

function createInitialConversations(agents: ConversationAgentSummary[]): Conversation[] {
  const sortedAgents = [
    ...agents.filter((agent) => agent.id === "general"),
    ...agents.filter((agent) => agent.id !== "general" && agent.type === "npc")
  ];

  return sortedAgents.map((agent) => ({
    id: agent.id,
    targetId: agent.id,
    title: agent.name,
    subtitle:
      agent.id === "general"
        ? "默认接收未指定对象的问题，整理已知线索"
        : agent.role,
    isExpanded: agent.id === "general",
    messages: []
  }));
}

export function createInitialPlayState({
  caseId = "hunters-lodge",
  entryChapterId = "chapter-1",
  agents = initialConversations.map((conversation) => ({
    id: conversation.targetId,
    name: conversation.title,
    role: conversation.subtitle ?? conversation.title,
    type: conversation.targetId === "general" ? "general" : "npc"
  })) as ConversationAgentSummary[]
}: {
  caseId?: string;
  entryChapterId?: StoryChapter["id"];
  agents?: ConversationAgentSummary[];
} = {}): LocalPlayState {
  return {
    version: PLAY_STATE_VERSION,
    caseId,
    currentChapterId: entryChapterId,
    conversations: createInitialConversations(agents),
    agentSessions: {},
    notes: [],
    playerState: initialPlayerState,
    ui: {
      activeNotebookFilter: "all",
      activeConversationId: "general",
      investigationOpen: false,
      investigationWidth: 380,
      notebookOpen: false,
      notebookWidth: 340,
      mobileTab: "story"
    },
    savedAt: new Date().toISOString()
  };
}

function parseUnknown(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value) as unknown;
  } catch {
    return undefined;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeConversations(value: unknown, initial: Conversation[]): Conversation[] {
  if (!Array.isArray(value)) {
    return initial;
  }

  return value.filter(isRecord).map((conversation, index) => {
    const initialConversation = initial[index];
    const messages = Array.isArray(conversation.messages)
      ? conversation.messages
          .filter(isRecord)
          .filter((message) => message.content !== LEGACY_GENERAL_OPENING_MESSAGE)
          .map((message, messageIndex) => ({
            id: typeof message.id === "string" ? message.id : `message-${messageIndex}`,
            role: message.role === "user" ? "user" as const : "assistant" as const,
            content: typeof message.content === "string" ? message.content : ""
          }))
          .filter((message) => message.content.trim().length > 0)
      : [];

    return {
      id:
        typeof conversation.id === "string"
          ? conversation.id
          : initialConversation?.id ?? `conversation-${index}`,
      targetId:
        typeof conversation.targetId === "string"
          ? conversation.targetId
          : initialConversation?.targetId ?? `conversation-${index}`,
      title:
        typeof conversation.title === "string"
          ? conversation.title
          : initialConversation?.title ?? "未命名角色",
      subtitle:
        typeof conversation.subtitle === "string"
          ? conversation.subtitle
          : initialConversation?.subtitle,
      isExpanded:
        typeof conversation.isExpanded === "boolean"
          ? conversation.isExpanded
          : Boolean(initialConversation?.isExpanded),
      messages
    };
  });
}

function normalizeNotes(value: unknown): NotebookNote[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const now = new Date().toISOString();

  return value.filter(isRecord).map((note, index) => ({
    id: typeof note.id === "string" ? note.id : `note-${index}`,
    title: typeof note.title === "string" ? note.title : "未命名笔记",
    text: typeof note.text === "string" ? note.text : "",
    tag:
      note.tag === "comment" ||
      note.tag === "testimony" ||
      note.tag === "doubt" ||
      note.tag === "contradiction" ||
      note.tag === "clue"
        ? note.tag
        : "clue",
    source: typeof note.source === "string" ? note.source : "手动记录",
    quote: typeof note.quote === "string" ? note.quote : undefined,
    createdAt: typeof note.createdAt === "string" ? note.createdAt : now,
    updatedAt: typeof note.updatedAt === "string" ? note.updatedAt : now
  }));
}

function normalizeAgentSessions(value: unknown): Record<string, AgentSession> {
  if (!isRecord(value)) {
    return {};
  }

  const sessions: Record<string, AgentSession> = {};
  for (const [key, session] of Object.entries(value)) {
    if (!isRecord(session)) {
      continue;
    }

    const mood =
      session.mood === "guarded" || session.mood === "cornered" || session.mood === "calm"
        ? session.mood
        : "calm";

    sessions[key] = {
      caseId: typeof session.caseId === "string" ? session.caseId : "",
      agentId: typeof session.agentId === "string" ? session.agentId : key,
      conversationId:
        typeof session.conversationId === "string" ? session.conversationId : key,
      pressureLevel:
        typeof session.pressureLevel === "number" ? session.pressureLevel : 0,
      revealedFactIds: Array.isArray(session.revealedFactIds)
        ? session.revealedFactIds.filter((id): id is string => typeof id === "string")
        : [],
      lastTopics: Array.isArray(session.lastTopics)
        ? session.lastTopics.filter((topic): topic is string => typeof topic === "string")
        : [],
      triggeredPressureRules: Array.isArray(session.triggeredPressureRules)
        ? session.triggeredPressureRules.filter((rule): rule is string => typeof rule === "string")
        : [],
      currentActAgentState:
        typeof session.currentActAgentState === "string"
          ? session.currentActAgentState
          : mood,
      mood
    };
  }

  return sessions;
}

export function normalizePlayState(
  value: unknown,
  options?: Parameters<typeof createInitialPlayState>[0]
): LocalPlayState {
  const initial = createInitialPlayState(options);
  const parsed = parseUnknown(value);

  if (!isRecord(parsed)) {
    return initial;
  }

  if (parsed.caseId !== initial.caseId) {
    return initial;
  }

  const ui = isRecord(parsed.ui) ? parsed.ui : {};

  return {
    ...initial,
    caseId: initial.caseId,
    currentChapterId:
      typeof parsed.currentChapterId === "string"
        ? parsed.currentChapterId
        : initial.currentChapterId,
    conversations: normalizeConversations(parsed.conversations, initial.conversations),
    agentSessions: normalizeAgentSessions(parsed.agentSessions),
    notes: normalizeNotes(parsed.notes),
    playerState: isRecord(parsed.playerState)
      ? ({ ...initial.playerState, ...parsed.playerState } as PlayerKnowledgeState)
      : initial.playerState,
    ui: {
      ...initial.ui,
      activeNotebookFilter:
        ui.activeNotebookFilter === "clue" ||
        ui.activeNotebookFilter === "comment" ||
        ui.activeNotebookFilter === "testimony" ||
        ui.activeNotebookFilter === "doubt" ||
        ui.activeNotebookFilter === "contradiction" ||
        ui.activeNotebookFilter === "all"
          ? ui.activeNotebookFilter
          : "all",
      activeConversationId:
        typeof ui.activeConversationId === "string"
          ? ui.activeConversationId
          : initial.ui.activeConversationId,
      investigationOpen:
        typeof ui.investigationOpen === "boolean"
          ? ui.investigationOpen
          : initial.ui.investigationOpen,
      investigationWidth:
        typeof ui.investigationWidth === "number"
          ? Math.min(560, Math.max(300, ui.investigationWidth))
          : initial.ui.investigationWidth,
      notebookOpen:
        typeof ui.notebookOpen === "boolean"
          ? ui.notebookOpen
          : initial.ui.notebookOpen,
      notebookWidth:
        typeof ui.notebookWidth === "number"
          ? Math.min(520, Math.max(300, ui.notebookWidth))
          : initial.ui.notebookWidth,
      mobileTab:
        ui.mobileTab === "story" ||
        ui.mobileTab === "investigation" ||
        ui.mobileTab === "notebook"
          ? ui.mobileTab
          : "story"
    },
    savedAt: typeof parsed.savedAt === "string" ? parsed.savedAt : initial.savedAt
  };
}

export function serializePlayState(state: LocalPlayState) {
  return JSON.stringify({ ...state, savedAt: new Date().toISOString() });
}
