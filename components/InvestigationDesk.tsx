"use client";

import { FormEvent, ReactNode, useMemo, useRef, useState } from "react";
import ConversationModule, { type ConversationMessage } from "./ConversationModule";
import NotebookDrawer, {
  type NotebookNote,
  type NoteFilter,
  type NoteTag
} from "./NotebookDrawer";
import type { PlayerKnowledgeState } from "../lib/case/schema";

type ConversationTarget =
  | "general"
  | "wilfred"
  | "simeon"
  | "elizabeth"
  | "joe"
  | "unsupported";

type RoutedMessage = {
  targetId: ConversationTarget;
  label: string;
};

type Conversation = {
  id: string;
  targetId: ConversationTarget;
  title: string;
  subtitle?: string;
  messages: ConversationMessage[];
  isExpanded: boolean;
};

interface InvestigationDeskProps {
  storySlot: ReactNode;
}

const unsupportedTargetMessage =
  "这个对象还没有配置为可询问角色。";

const initialConversations: Conversation[] = [
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
        content: "我会基于你已掌握的信息协助调查；如果问题更适合某位人物，我会把对话转到对应 NPC。"
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

const initialPlayerState: PlayerKnowledgeState = {
  discoveredClueIds: [],
  heardTestimonyIds: [],
  knownContradictionIds: [],
  confrontedAgentIds: [],
  askedTopics: []
};

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const payload = (await response.json().catch(() => undefined)) as
    | { error?: unknown }
    | undefined;

  if (!response.ok) {
    throw new Error(typeof payload?.error === "string" ? payload.error : "请求失败。");
  }

  return payload as T;
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export default function InvestigationDesk({ storySlot }: InvestigationDeskProps) {
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [notes, setNotes] = useState<NotebookNote[]>([]);
  const [notebookOpen, setNotebookOpen] = useState(false);
  const [activeTag, setActiveTag] = useState<NoteFilter>("all");
  const [draft, setDraft] = useState("");
  const [loadingConversationId, setLoadingConversationId] = useState<string | null>(null);
  const [playerState, setPlayerState] = useState<PlayerKnowledgeState>(initialPlayerState);
  const submitInFlightRef = useRef(false);

  const openClass = notebookOpen ? "notebook-open" : "notebook-closed";

  const conversationByTarget = useMemo(() => {
    return new Map(conversations.map((conversation) => [conversation.targetId, conversation]));
  }, [conversations]);

  const toggleConversation = (id: string) => {
    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === id
          ? { ...conversation, isExpanded: !conversation.isExpanded }
          : conversation
      )
    );
  };

  const saveExcerpt = (content: string, source: string) => {
    setNotes((current) => [
      {
        id: makeId("note"),
        title: `摘录 ${current.length + 1}`,
        text: content,
        tag: "clue" satisfies NoteTag,
        source
      },
      ...current
    ]);
    setActiveTag("clue");
    setNotebookOpen(true);
  };

  const updateNote = (
    id: string,
    updates: Partial<Pick<NotebookNote, "title" | "text" | "tag">>
  ) => {
    setNotes((current) =>
      current.map((note) => (note.id === id ? { ...note, ...updates } : note))
    );
  };

  const appendMessages = (conversationId: string, messages: ConversationMessage[]) => {
    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === conversationId
          ? {
              ...conversation,
              isExpanded: true,
              messages: [...conversation.messages, ...messages]
            }
          : conversation
      )
    );
  };

  const appendUnsupportedToGeneral = (message: string) => {
    const userMessage: ConversationMessage = {
      id: makeId("user"),
      role: "user",
      content: message
    };
    const assistantMessage: ConversationMessage = {
      id: makeId("assistant"),
      role: "assistant",
      content: unsupportedTargetMessage
    };

    appendMessages("general", [userMessage, assistantMessage]);
  };

  const submitMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const message = draft.trim();
    if (!message || loadingConversationId || submitInFlightRef.current) {
      return;
    }

    submitInFlightRef.current = true;
    setDraft("");
    setLoadingConversationId("routing");
    const nextPlayerState: PlayerKnowledgeState = {
      ...playerState,
      askedTopics: [...playerState.askedTopics, message]
    };
    setPlayerState(nextPlayerState);

    try {
      const routed = await postJson<RoutedMessage | { error: string }>("/api/route-message", {
        message
      });

      if ("error" in routed) {
        appendMessages("general", [
          { id: makeId("user"), role: "user", content: message },
          { id: makeId("assistant"), role: "assistant", content: routed.error }
        ]);
        return;
      }

      if (routed.targetId === "unsupported") {
        appendUnsupportedToGeneral(message);
        return;
      }

      const conversation = conversationByTarget.get(routed.targetId);
      if (!conversation) {
        appendUnsupportedToGeneral(message);
        return;
      }

      const userMessage: ConversationMessage = {
        id: makeId("user"),
        role: "user",
        content: message
      };

      appendMessages(conversation.id, [userMessage]);
      setLoadingConversationId(conversation.id);

      try {
        const response = await postJson<{ content?: string; error?: string }>("/api/investigate", {
          targetId: routed.targetId,
          message,
          history: conversation.messages,
          playerState: nextPlayerState
        });

        appendMessages(conversation.id, [
          {
            id: makeId("assistant"),
            role: "assistant",
            content: response.error ?? response.content ?? "没有得到有效回复。"
          }
        ]);
      } catch (error) {
        appendMessages(conversation.id, [
          {
            id: makeId("assistant"),
            role: "assistant",
            content: getErrorMessage(error, "调查线路暂时不可用，请稍后再试。")
          }
        ]);
      }
    } catch (error) {
      appendMessages("general", [
        { id: makeId("user"), role: "user", content: message },
        {
          id: makeId("assistant"),
          role: "assistant",
          content: getErrorMessage(error, "调查线路暂时不可用，请稍后再试。")
        }
      ]);
    } finally {
      submitInFlightRef.current = false;
      setLoadingConversationId(null);
    }
  };

  return (
    <main className={`case-shell ${openClass}`}>
      <h2 className="sr-only">New Novels</h2>
      {storySlot}

      <section className="investigation-desk" aria-labelledby="desk-title">
        <div className="desk-header">
          <div>
            <p className="desk-kicker">Investigation desk</p>
            <h2 id="desk-title">调查台</h2>
          </div>
        </div>

        <div className="conversation-stack">
          {conversations.map((conversation) => (
            <ConversationModule
              id={conversation.id}
              key={conversation.id}
              title={conversation.title}
              subtitle={conversation.subtitle}
              isExpanded={conversation.isExpanded}
              isLoading={loadingConversationId === conversation.id}
              messages={conversation.messages}
              onToggle={() => toggleConversation(conversation.id)}
              onSaveExcerpt={(content) => saveExcerpt(content, conversation.title)}
            />
          ))}
        </div>

        <form className="global-input" onSubmit={submitMessage}>
          <label htmlFor="investigation-message">新的调查问题</label>
          <div className="input-row">
            <textarea
              id="investigation-message"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="询问现场、威尔弗里德、铁匠西米恩、伊丽莎白或疯乔..."
              rows={3}
            />
            <button type="submit" disabled={!draft.trim() || Boolean(loadingConversationId)}>
              发送
            </button>
          </div>
        </form>
      </section>

      <NotebookDrawer
        isOpen={notebookOpen}
        notes={notes}
        activeTag={activeTag}
        onToggle={() => setNotebookOpen((current) => !current)}
        onFilterChange={setActiveTag}
        onUpdateNote={updateNote}
      />
    </main>
  );
}
