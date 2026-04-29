"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import ConfirmDialog from "./ConfirmDialog";
import ConversationModule, { type ConversationMessage } from "./ConversationModule";
import NotebookDrawer, {
  type NotebookNote,
  type NoteTag
} from "./NotebookDrawer";
import type { PlayerKnowledgeState } from "../lib/case/schema";
import { makeId } from "../lib/game/ids";
import {
  createInitialPlayState,
  normalizePlayState,
  PLAY_STATE_STORAGE_KEY,
  serializePlayState,
  type ConversationTarget,
  type LocalPlayState
} from "../lib/game/play-state";

type RoutedMessage = {
  targetId: ConversationTarget;
  label: string;
};

interface InvestigationDeskProps {
  storySlot: ReactNode;
}

const unsupportedTargetMessage =
  "这个对象还没有配置为可询问角色。";

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
  const [playState, setPlayState] = useState<LocalPlayState>(() => {
    if (typeof window === "undefined") {
      return createInitialPlayState();
    }

    return normalizePlayState(window.localStorage.getItem(PLAY_STATE_STORAGE_KEY));
  });
  const [draft, setDraft] = useState("");
  const [loadingConversationId, setLoadingConversationId] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const submitInFlightRef = useRef(false);
  const conversations = playState.conversations;
  const notes = playState.notes;
  const playerState = playState.playerState;
  const activeTag = playState.ui.activeNotebookFilter;
  const notebookOpen = Boolean(playState.ui.notebookOpen);

  const openClass = notebookOpen ? "notebook-open" : "notebook-closed";

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(PLAY_STATE_STORAGE_KEY, serializePlayState(playState));
  }, [playState]);

  const conversationByTarget = useMemo(() => {
    return new Map(conversations.map((conversation) => [conversation.targetId, conversation]));
  }, [conversations]);

  const toggleConversation = (id: string) => {
    setPlayState((current) => ({
      ...current,
      conversations: current.conversations.map((conversation) =>
        conversation.id === id
          ? { ...conversation, isExpanded: !conversation.isExpanded }
          : conversation
      ),
      ui: { ...current.ui, activeConversationId: id }
    }));
  };

  const setActiveTag = (activeNotebookFilter: LocalPlayState["ui"]["activeNotebookFilter"]) => {
    setPlayState((current) => ({
      ...current,
      ui: { ...current.ui, activeNotebookFilter }
    }));
  };

  const setNotebookOpen = (notebookOpen: boolean | ((current: boolean) => boolean)) => {
    setPlayState((current) => ({
      ...current,
      ui: {
        ...current.ui,
        notebookOpen:
          typeof notebookOpen === "function"
            ? notebookOpen(Boolean(current.ui.notebookOpen))
            : notebookOpen
      }
    }));
  };

  const setNotes = (updater: (current: NotebookNote[]) => NotebookNote[]) => {
    setPlayState((current) => ({
      ...current,
      notes: updater(current.notes)
    }));
  };

  const setPlayerState = (playerState: PlayerKnowledgeState) => {
    setPlayState((current) => ({
      ...current,
      playerState
    }));
  };

  const setConversations = (
    updater: (current: LocalPlayState["conversations"]) => LocalPlayState["conversations"]
  ) => {
    setPlayState((current) => ({
      ...current,
      conversations: updater(current.conversations)
    }));
  };

  const resetPlayState = () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(PLAY_STATE_STORAGE_KEY);
    }

    setPlayState(createInitialPlayState());
    setDraft("");
    setResetOpen(false);
  };

  const saveExcerpt = (content: string, source: string) => {
    const now = new Date().toISOString();
    setNotes((current) => [
      {
        id: makeId("note"),
        title: `摘录 ${current.length + 1}`,
        text: content,
        tag: "clue" satisfies NoteTag,
        source,
        createdAt: now,
        updatedAt: now
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
      current.map((note) =>
        note.id === id
          ? { ...note, ...updates, updatedAt: new Date().toISOString() }
          : note
      )
    );
  };

  const createNote = () => {
    const now = new Date().toISOString();
    setNotes((current) => [
      {
        id: makeId("note"),
        title: "新笔记",
        text: "",
        tag: "clue",
        source: "手动记录",
        createdAt: now,
        updatedAt: now
      },
      ...current
    ]);
    setActiveTag("all");
    setNotebookOpen(true);
  };

  const deleteNote = (id: string) => {
    setNotes((current) => current.filter((note) => note.id !== id));
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
      <div className="utility-actions">
        <button
          type="button"
          className="utility-button"
          onClick={() => setResetOpen(true)}
        >
          重新开始
        </button>
      </div>
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
        onCreateNote={createNote}
        onDeleteNote={deleteNote}
      />
      {resetOpen ? (
        <ConfirmDialog
          title="重新开始调查？"
          description="这会清空当前浏览器里的章节进度、对话记录和侦探笔记。"
          confirmLabel="确认重置"
          onCancel={() => setResetOpen(false)}
          onConfirm={resetPlayState}
        />
      ) : null}
    </main>
  );
}
