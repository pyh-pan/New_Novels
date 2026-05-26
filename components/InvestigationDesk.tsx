"use client";

import {
  ChangeEvent,
  FormEvent,
  KeyboardEvent,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import ConfirmDialog from "./ConfirmDialog";
import ConversationModule, { type ConversationMessage } from "./ConversationModule";
import NotebookDrawer, {
  type NotebookNote,
  type NoteTag
} from "./NotebookDrawer";
import {
  SelectionAnnotationPreview,
  type SelectionCommentPayload
} from "./SelectionCommentPopover";
import type { CaseAgent, PlayerKnowledgeState } from "../lib/case/schema";
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
  caseId?: string;
  caseTitle?: string;
  agents?: Pick<CaseAgent, "id" | "name" | "role" | "type">[];
  entryChapterId?: string;
  storySlot: (props: {
    currentChapterId: string;
    onChapterChange: (chapterId: string) => void;
    onCommentSelection: (payload: SelectionCommentPayload) => void;
  }) => ReactNode;
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

function agentStateLabel(mood?: "calm" | "guarded" | "cornered") {
  if (mood === "guarded") {
    return "状态：谨慎";
  }
  if (mood === "cornered") {
    return "状态：紧绷";
  }
  return undefined;
}

type MentionRange = {
  start: number;
  end: number;
  query: string;
};

function getMentionRange(value: string, cursor: number): MentionRange | null {
  const beforeCursor = value.slice(0, cursor);
  const atIndex = beforeCursor.lastIndexOf("@");

  if (atIndex < 0) {
    return null;
  }

  const prefix = atIndex === 0 ? "" : value[atIndex - 1];
  if (prefix && !/\s/.test(prefix)) {
    return null;
  }

  const query = beforeCursor.slice(atIndex + 1);
  if (/\s/.test(query)) {
    return null;
  }

  return {
    start: atIndex,
    end: cursor,
    query
  };
}

function stripMention(message: string, agentName: string) {
  return message
    .replace(`@${agentName}`, "")
    .replace(/\s+/g, " ")
    .trim();
}

export default function InvestigationDesk({
  caseId,
  caseTitle = "猎人小屋疑案",
  agents,
  entryChapterId,
  storySlot
}: InvestigationDeskProps) {
  const initialPlayStateOptions = useMemo(
    () => ({ caseId, entryChapterId, agents }),
    [agents, caseId, entryChapterId]
  );
  const [playState, setPlayState] = useState<LocalPlayState>(() =>
    createInitialPlayState(initialPlayStateOptions)
  );
  const [hasHydratedStorage, setHasHydratedStorage] = useState(false);
  const [draft, setDraft] = useState("");
  const [mentionRange, setMentionRange] = useState<MentionRange | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
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

    setPlayState(
      normalizePlayState(
        window.localStorage.getItem(PLAY_STATE_STORAGE_KEY),
        initialPlayStateOptions
      )
    );
    setHasHydratedStorage(true);
  }, [initialPlayStateOptions]);

  useEffect(() => {
    if (typeof window === "undefined" || !hasHydratedStorage) {
      return;
    }

    window.localStorage.setItem(PLAY_STATE_STORAGE_KEY, serializePlayState(playState));
  }, [hasHydratedStorage, playState]);

  const conversationByTarget = useMemo(() => {
    return new Map(conversations.map((conversation) => [conversation.targetId, conversation]));
  }, [conversations]);

  const mentionOptions = useMemo(
    () =>
      conversations.map((conversation) => ({
        id: conversation.targetId,
        name: conversation.title
      })),
    [conversations]
  );

  const visibleMentionOptions = useMemo(() => {
    if (!mentionRange) {
      return [];
    }

    const query = mentionRange.query.trim().toLocaleLowerCase();
    return mentionOptions.filter((option) =>
      query ? option.name.toLocaleLowerCase().includes(query) : true
    );
  }, [mentionOptions, mentionRange]);

  const resolvedDraftTarget = useMemo(() => {
    const message = draft.trim();
    const sortedOptions = [...mentionOptions].sort((left, right) => right.name.length - left.name.length);
    const matched = sortedOptions.find((option) => message.includes(`@${option.name}`));

    if (!matched) {
      return {
        targetId: "general" as ConversationTarget,
        message
      };
    }

    return {
      targetId: matched.id,
      message: stripMention(message, matched.name) || message
    };
  }, [draft, mentionOptions]);

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

    setPlayState(createInitialPlayState(initialPlayStateOptions));
    setDraft("");
    setResetOpen(false);
  };

  const saveSelectionComment = ({ quote, comment, source }: SelectionCommentPayload) => {
    const now = new Date().toISOString();
    setNotes((current) => [
      {
        id: makeId("note"),
        title: `批注 ${current.length + 1}`,
        text: comment,
        tag: "comment" satisfies NoteTag,
        source,
        quote,
        createdAt: now,
        updatedAt: now
      },
      ...current
    ]);
    setActiveTag("all");
    setExcerptNotice("批注已同步到侦探笔记。");
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
        tag: "comment",
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

  const submitMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const { targetId, message } = resolvedDraftTarget;
    if (!message || loadingConversationId || submitInFlightRef.current) {
      return;
    }

    const conversation = conversationByTarget.get(targetId) ?? conversationByTarget.get("general");
    if (!conversation) {
      return;
    }

    submitInFlightRef.current = true;
    setDraft("");
    setMentionRange(null);
    setMentionIndex(0);
    setLoadingConversationId(conversation.id);
    const nextPlayerState: PlayerKnowledgeState = {
      ...playerState,
      askedTopics: [...playerState.askedTopics, message]
    };
    setPlayerState(nextPlayerState);

    const userMessage: ConversationMessage = {
      id: makeId("user"),
      role: "user",
      content: message
    };

    appendMessages(conversation.id, [userMessage]);

    try {
      const response = await postJson<InvestigationResponse>("/api/investigate", {
        caseId,
        targetId: conversation.targetId,
        message,
        history: conversation.messages,
        playerState: nextPlayerState,
        agentSession: agentSessions[conversation.targetId]
      });

      mergeInvestigationPatch(conversation.targetId, response);

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
    } finally {
      submitInFlightRef.current = false;
      setLoadingConversationId(null);
    }
  };

  const updateDraft = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const nextDraft = event.target.value;
    const cursor = event.target.selectionStart ?? nextDraft.length;
    const nextMentionRange = getMentionRange(nextDraft, cursor);
    setDraft(nextDraft);
    setMentionRange(nextMentionRange);
    setMentionIndex(0);
  };

  const insertMention = (option: { id: ConversationTarget; name: string }) => {
    if (!mentionRange) {
      return;
    }

    const nextDraft = `${draft.slice(0, mentionRange.start)}@${option.name} ${draft.slice(mentionRange.end)}`;
    setDraft(nextDraft);
    setMentionRange(null);
    setMentionIndex(0);
  };

  const submitOnShortcut = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionRange && visibleMentionOptions.length > 0) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setMentionIndex((current) => (current + 1) % visibleMentionOptions.length);
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setMentionIndex(
          (current) => (current - 1 + visibleMentionOptions.length) % visibleMentionOptions.length
        );
        return;
      }
      if (event.key === "Enter" && !event.metaKey && !event.ctrlKey && !event.shiftKey) {
        event.preventDefault();
        insertMention(visibleMentionOptions[mentionIndex] ?? visibleMentionOptions[0]);
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        setMentionRange(null);
        return;
      }
    }

    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      formRef.current?.requestSubmit();
    }
  };

  return (
    <main className={`case-shell ${openClass}`}>
      <header className="case-topbar">
        <div>
          <h1>{caseTitle}</h1>
        </div>
        <div className="case-actions" aria-label="案件操作">
          {!notebookVisible ? (
            <button
              type="button"
              className="utility-button"
              onClick={() => setResetOpen(true)}
            >
              重新开始
            </button>
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
            setPlayState((current) => ({ ...current, currentChapterId })),
          onCommentSelection: saveSelectionComment
        })}
      </div>

      <section
        className={`investigation-desk workspace workspace-investigation ${
          mobileTab === "investigation" ? "is-mobile-active" : ""
        }`}
        aria-labelledby="desk-title"
      >
        <div className="desk-header">
          <h2 id="desk-title">调查台</h2>
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
              onCommentSelection={saveSelectionComment}
            />
          ))}
        </div>

        {excerptNotice ? <p className="excerpt-notice">{excerptNotice}</p> : null}

        <form ref={formRef} className="global-input" onSubmit={submitMessage}>
          <label className="sr-only" htmlFor="investigation-message">
            调查问题
          </label>
          <div className="input-row">
            {mentionRange && visibleMentionOptions.length > 0 ? (
              <div className="mention-menu" role="listbox" aria-label="选择对话角色">
                {visibleMentionOptions.map((option, index) => (
                  <button
                    type="button"
                    key={option.id}
                    role="option"
                    aria-selected={index === mentionIndex}
                    className={index === mentionIndex ? "is-active" : ""}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      insertMention(option);
                    }}
                  >
                    {option.name}
                  </button>
                ))}
              </div>
            ) : null}
            <textarea
              id="investigation-message"
              value={draft}
              onChange={updateDraft}
              onKeyDown={submitOnShortcut}
              placeholder="提问，或 @角色"
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
          activeTag={activeTag}
          onToggle={() => setNotebookOpen((current) => !current)}
          onFilterChange={setActiveTag}
          onUpdateNote={updateNote}
          onCreateNote={createNote}
          onDeleteNote={deleteNote}
          accusationHref={caseId ? `/cases/${caseId}/accuse` : "/accuse"}
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
      <SelectionAnnotationPreview />
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
