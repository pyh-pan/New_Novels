"use client";

import {
  FormEvent,
  KeyboardEvent,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import CaseImportPanel from "./CaseImportPanel";
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
  type LocalPlayState,
  type MobileTab
} from "../lib/game/play-state";

type RoutedMessage = {
  targetId: ConversationTarget;
  label: string;
};

type InvestigationResponse = {
  content?: string;
  error?: string;
  agentSession?: LocalPlayState["agentSessions"][string];
  playerState?: PlayerKnowledgeState;
  actGate?: {
    nextActId: string;
    nextChapterId?: string;
    unlockNarratives: string[];
  };
};

interface InvestigationDeskProps {
  caseTitle?: string;
  storySlot: (props: {
    currentChapterId: string;
    onChapterChange: (chapterId: string) => void;
  }) => ReactNode;
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

function agentStateLabel(mood?: "calm" | "guarded" | "cornered") {
  if (mood === "guarded") {
    return "状态：谨慎";
  }
  if (mood === "cornered") {
    return "状态：紧绷";
  }
  return undefined;
}

export default function InvestigationDesk({
  caseTitle = "钟楼下的锤击案",
  storySlot
}: InvestigationDeskProps) {
  const [playState, setPlayState] = useState<LocalPlayState>(() => createInitialPlayState());
  const [hasHydratedStorage, setHasHydratedStorage] = useState(false);
  const [draft, setDraft] = useState("");
  const [loadingConversationId, setLoadingConversationId] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [excerptNotice, setExcerptNotice] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const submitInFlightRef = useRef(false);
  const conversations = playState.conversations;
  const notes = playState.notes;
  const playerState = playState.playerState;
  const agentSessions = playState.agentSessions;
  const activeTag = playState.ui.activeNotebookFilter;
  const notebookOpen = Boolean(playState.ui.notebookOpen);
  const mobileTab = playState.ui.mobileTab ?? "story";
  const notebookVisible = notebookOpen || mobileTab === "notebook";

  const openClass = notebookVisible ? "notebook-open" : "notebook-closed";

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setPlayState(normalizePlayState(window.localStorage.getItem(PLAY_STATE_STORAGE_KEY)));
    setHasHydratedStorage(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !hasHydratedStorage) {
      return;
    }

    window.localStorage.setItem(PLAY_STATE_STORAGE_KEY, serializePlayState(playState));
  }, [hasHydratedStorage, playState]);

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

  const setMobileTab = (mobileTab: MobileTab) => {
    setPlayState((current) => ({
      ...current,
      ui: { ...current.ui, mobileTab }
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

  const mergeInvestigationPatch = (
    targetId: ConversationTarget,
    response: InvestigationResponse
  ) => {
    setPlayState((current) => ({
      ...current,
      currentChapterId:
        response.actGate?.nextChapterId ?? current.currentChapterId,
      agentSessions: response.agentSession
        ? {
            ...current.agentSessions,
            [targetId]: response.agentSession
          }
        : current.agentSessions,
      playerState: response.playerState ?? current.playerState
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
    setExcerptNotice("已加入侦探笔记。");
    window.setTimeout(() => setExcerptNotice(null), 1800);
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
        const response = await postJson<InvestigationResponse>("/api/investigate", {
          targetId: routed.targetId,
          message,
          history: conversation.messages,
          playerState: nextPlayerState,
          agentSession: agentSessions[routed.targetId]
        });

        mergeInvestigationPatch(routed.targetId, response);

        appendMessages(conversation.id, [
          {
            id: makeId("assistant"),
            role: "assistant",
            content: response.error ?? response.content ?? "没有得到有效回复。"
          }
        ]);
        if (response.actGate?.unlockNarratives.length) {
          appendMessages("general", [
            {
              id: makeId("act"),
              role: "assistant",
              content: response.actGate.unlockNarratives.join("\n")
            }
          ]);
        }
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

  const submitOnShortcut = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      formRef.current?.requestSubmit();
    }
  };

  return (
    <main className={`case-shell ${openClass}`}>
      <h2 className="sr-only">New Novels</h2>
      <header className="case-topbar">
        <div>
          <p className="case-eyebrow">New Novels</p>
          <h1>{caseTitle}</h1>
        </div>
        <div className="case-actions" aria-label="案件操作">
          {!notebookVisible ? (
            <>
              <CaseImportPanel />
              <button
                type="button"
                className="utility-button"
                onClick={() => setResetOpen(true)}
              >
                重新开始
              </button>
            </>
          ) : null}
        </div>
      </header>
      <div
        className={`workspace workspace-story ${
          mobileTab === "story" ? "is-mobile-active" : ""
        }`}
      >
        {storySlot({
          currentChapterId: playState.currentChapterId,
          onChapterChange: (currentChapterId) =>
            setPlayState((current) => ({ ...current, currentChapterId }))
        })}
      </div>

      <section
        className={`investigation-desk workspace workspace-investigation ${
          mobileTab === "investigation" ? "is-mobile-active" : ""
        }`}
        aria-labelledby="desk-title"
      >
        <div className="desk-header">
          <div>
            <p className="desk-kicker">Agent investigation</p>
            <h2 id="desk-title">调查台</h2>
          </div>
          <p className="desk-status" aria-live="polite">
            {loadingConversationId ? "思考中" : "待提问"}
          </p>
        </div>

        <div className="conversation-stack">
          {conversations.map((conversation) => (
            <ConversationModule
              id={conversation.id}
              key={conversation.id}
              title={conversation.title}
              subtitle={conversation.subtitle}
              stateLabel={agentStateLabel(agentSessions[conversation.targetId]?.mood)}
              isExpanded={conversation.isExpanded}
              isLoading={loadingConversationId === conversation.id}
              messages={conversation.messages}
              onToggle={() => toggleConversation(conversation.id)}
              onSaveExcerpt={(content) => saveExcerpt(content, conversation.title)}
            />
          ))}
        </div>

        {excerptNotice ? <p className="excerpt-notice">{excerptNotice}</p> : null}

        <form ref={formRef} className="global-input" onSubmit={submitMessage}>
          <div className="composer-heading">
            <label htmlFor="investigation-message">新的调查问题</label>
            <span>⌘ Enter 发送</span>
          </div>
          <div className="input-row">
            <textarea
              id="investigation-message"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={submitOnShortcut}
              placeholder="直接问：锤子和伤口有什么矛盾？威尔弗里德当时在哪里？"
              rows={3}
            />
            <button type="submit" disabled={!draft.trim() || Boolean(loadingConversationId)}>
              发送
            </button>
          </div>
        </form>
      </section>

      <div
        className={`workspace workspace-notebook ${
          mobileTab === "notebook" ? "is-mobile-active" : ""
        }`}
      >
        <NotebookDrawer
          isOpen={notebookVisible}
          notes={notes}
          hypotheses={playerState.hypotheses}
          knownContradictions={playerState.knownContradictionIds}
          activeTag={activeTag}
          onToggle={() => setNotebookOpen((current) => !current)}
          onFilterChange={setActiveTag}
          onUpdateNote={updateNote}
          onCreateNote={createNote}
          onDeleteNote={deleteNote}
          onCreateHypothesis={(hypothesis) =>
            setPlayState((current) => ({
              ...current,
              playerState: {
                ...current.playerState,
                hypotheses: [...new Set([...current.playerState.hypotheses, hypothesis])]
              }
            }))
          }
          onDeleteHypothesis={(hypothesis) =>
            setPlayState((current) => ({
              ...current,
              playerState: {
                ...current.playerState,
                hypotheses: current.playerState.hypotheses.filter((item) => item !== hypothesis)
              }
            }))
          }
        />
      </div>
      {resetOpen ? (
        <ConfirmDialog
          title="重新开始调查？"
          description="这会清空当前浏览器里的章节进度、对话记录和侦探笔记。"
          confirmLabel="确认重置"
          onCancel={() => setResetOpen(false)}
          onConfirm={resetPlayState}
        />
      ) : null}
      <nav className="mobile-tabbar" role="tablist" aria-label="移动端工作区">
        <button
          type="button"
          role="tab"
          aria-selected={mobileTab === "story"}
          onClick={() => setMobileTab("story")}
        >
          故事
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mobileTab === "investigation"}
          onClick={() => setMobileTab("investigation")}
        >
          调查
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mobileTab === "notebook"}
          onClick={() => setMobileTab("notebook")}
        >
          笔记
        </button>
      </nav>
    </main>
  );
}
