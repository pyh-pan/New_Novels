import type { ConversationMessage } from "../../components/ConversationModule";
import type { NotebookNote, NoteFilter } from "../../components/NotebookDrawer";
import type { PlayerKnowledgeState } from "../case/schema";

export const PLAY_STATE_VERSION = 1;
export const PLAY_STATE_STORAGE_KEY = "new-novels.play-state.v1";

export type ConversationTarget =
  | "general"
  | "wilfred"
  | "simeon"
  | "elizabeth"
  | "joe"
  | "unsupported";

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
  currentChapterId: string;
  conversations: Conversation[];
  notes: NotebookNote[];
  playerState: PlayerKnowledgeState;
  ui: {
    activeNotebookFilter: NoteFilter;
    activeConversationId?: string;
    notebookOpen?: boolean;
    mobileTab?: MobileTab;
  };
  savedAt: string;
};

export const initialPlayerState: PlayerKnowledgeState = {
  discoveredClueIds: [],
  heardTestimonyIds: [],
  knownContradictionIds: [],
  confrontedAgentIds: [],
  askedTopics: []
};

export const initialConversations: Conversation[] = [
  {
    id: "general",
    targetId: "general",
    title: "通用调查助手",
    subtitle: "理解问题、整理已知线索，并自动转交给相关 NPC",
    isExpanded: true,
    messages: [
      {
        id: "general-opening",
        role: "assistant",
        content:
          "我会基于你已掌握的信息协助调查；如果问题更适合某位人物，我会把对话转到对应 NPC。"
      }
    ]
  },
  {
    id: "wilfred",
    targetId: "wilfred",
    title: "威尔弗里德牧师",
    subtitle: "死者的弟弟，村中牧师",
    isExpanded: false,
    messages: []
  },
  {
    id: "simeon",
    targetId: "simeon",
    title: "铁匠西米恩",
    subtitle: "村中铁匠，表面嫌疑人",
    isExpanded: false,
    messages: []
  },
  {
    id: "elizabeth",
    targetId: "elizabeth",
    title: "伊丽莎白",
    subtitle: "铁匠妻子",
    isExpanded: false,
    messages: []
  },
  {
    id: "joe",
    targetId: "joe",
    title: "疯乔",
    subtitle: "村中边缘人",
    isExpanded: false,
    messages: []
  }
];

export function createInitialPlayState(): LocalPlayState {
  return {
    version: PLAY_STATE_VERSION,
    currentChapterId: "chapter-1",
    conversations: initialConversations,
    notes: [],
    playerState: initialPlayerState,
    ui: {
      activeNotebookFilter: "all",
      activeConversationId: "general",
      notebookOpen: false,
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
      note.tag === "testimony" ||
      note.tag === "doubt" ||
      note.tag === "contradiction" ||
      note.tag === "clue"
        ? note.tag
        : "clue",
    source: typeof note.source === "string" ? note.source : "手动记录",
    createdAt: typeof note.createdAt === "string" ? note.createdAt : now,
    updatedAt: typeof note.updatedAt === "string" ? note.updatedAt : now
  }));
}

export function normalizePlayState(value: unknown): LocalPlayState {
  const initial = createInitialPlayState();
  const parsed = parseUnknown(value);

  if (!isRecord(parsed)) {
    return initial;
  }

  const ui = isRecord(parsed.ui) ? parsed.ui : {};

  return {
    ...initial,
    currentChapterId:
      typeof parsed.currentChapterId === "string"
        ? parsed.currentChapterId
        : initial.currentChapterId,
    conversations: Array.isArray(parsed.conversations)
      ? (parsed.conversations as Conversation[])
      : initial.conversations,
    notes: normalizeNotes(parsed.notes),
    playerState: isRecord(parsed.playerState)
      ? ({ ...initial.playerState, ...parsed.playerState } as PlayerKnowledgeState)
      : initial.playerState,
    ui: {
      ...initial.ui,
      activeNotebookFilter:
        ui.activeNotebookFilter === "clue" ||
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
      notebookOpen:
        typeof ui.notebookOpen === "boolean"
          ? ui.notebookOpen
          : initial.ui.notebookOpen,
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
