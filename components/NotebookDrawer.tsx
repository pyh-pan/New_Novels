"use client";

import { ChangeEvent, useLayoutEffect, useRef, useState } from "react";
import AppLink from "./AppLink";
import ConfirmDialog from "./ConfirmDialog";
import Icon from "./Icon";

export type NoteTag = "comment" | "clue" | "testimony" | "doubt" | "contradiction";
export type NoteFilter = "all" | NoteTag;

export type NotebookNote = {
  id: string;
  title: string;
  text: string;
  tag: NoteTag;
  source: string;
  quote?: string;
  createdAt: string;
  updatedAt: string;
};

interface NotebookDrawerProps {
  isOpen: boolean;
  notes: NotebookNote[];
  activeTag: NoteFilter;
  onToggle: () => void;
  onFilterChange: (tag: NoteFilter) => void;
  onUpdateNote: (
    id: string,
    updates: Partial<Pick<NotebookNote, "title" | "text" | "tag">>
  ) => void;
  onCreateNote: () => void;
  onDeleteNote: (id: string) => void;
  accusationHref?: string;
  showCloseButton?: boolean;
}

const tagLabels: Record<NoteFilter, string> = {
  all: "全部",
  comment: "批注",
  clue: "线索",
  testimony: "证词",
  doubt: "疑点",
  contradiction: "矛盾"
};

function resizeNoteTextarea(textarea: HTMLTextAreaElement) {
  textarea.style.height = "auto";
  textarea.style.height = `${textarea.scrollHeight}px`;
}

interface AutoResizeNoteTextareaProps {
  value: string;
  onChange: (value: string) => void;
}

function AutoResizeNoteTextarea({ value, onChange }: AutoResizeNoteTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useLayoutEffect(() => {
    if (textareaRef.current) {
      resizeNoteTextarea(textareaRef.current);
    }
  }, [value]);

  const updateValue = (event: ChangeEvent<HTMLTextAreaElement>) => {
    resizeNoteTextarea(event.target);
    onChange(event.target.value);
  };

  return (
    <textarea
      ref={textareaRef}
      value={value}
      aria-label="笔记正文"
      rows={1}
      onChange={updateValue}
    />
  );
}

export default function NotebookDrawer({
  isOpen,
  notes,
  activeTag,
  onToggle,
  onFilterChange,
  onUpdateNote,
  onCreateNote,
  onDeleteNote,
  accusationHref = "/accuse",
  showCloseButton = true
}: NotebookDrawerProps) {
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const visibleNotes =
    activeTag === "all" ? notes : notes.filter((note) => note.tag === activeTag);
  const filters = Object.keys(tagLabels) as NoteFilter[];
  const editableTags = filters.filter((tag): tag is NoteTag => tag !== "all");
  const pendingDeleteNote = notes.find((note) => note.id === pendingDeleteId);

  if (!isOpen) {
    return null;
  }

  return (
    <aside className="notebook-drawer" aria-labelledby="notebook-title">
      <div className="notebook-header">
        <div>
          <h2 id="notebook-title">侦探笔记</h2>
        </div>
        <div className="notebook-header-actions">
          <button
            type="button"
            className="notebook-create"
            aria-label="新建笔记"
            title="新建笔记"
            onClick={onCreateNote}
          >
            <Icon name="plus" />
          </button>
          {showCloseButton ? (
            <button
              type="button"
              className="notebook-close"
              aria-label="收起侦探笔记"
              onClick={onToggle}
            >
              <Icon name="chevronRight" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="notebook-filters" aria-label="笔记标签筛选">
        {filters.map((tag) => (
          <button
            type="button"
            key={tag}
            className={activeTag === tag ? "is-active" : ""}
            aria-pressed={activeTag === tag}
            onClick={() => onFilterChange(tag)}
          >
            {tagLabels[tag]}
          </button>
        ))}
      </div>

      <div className="notebook-notes">
        {visibleNotes.length === 0 ? (
          <p className="notebook-empty">暂无笔记</p>
        ) : (
          visibleNotes.map((note) => (
            <article className={`note-card note-${note.tag}`} key={note.id}>
              <div className="note-card-header">
                <label className="note-field note-tag-field">
                  <span className="sr-only">笔记标签</span>
                  <select
                    value={note.tag}
                    aria-label="笔记标签"
                    onChange={(event) =>
                      onUpdateNote(note.id, { tag: event.target.value as NoteTag })
                    }
                  >
                    {editableTags.map((tag) => (
                      <option key={tag} value={tag}>
                        {tagLabels[tag]}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  className="note-delete"
                  aria-label={`删除笔记：${tagLabels[note.tag]}，${note.source}`}
                  onClick={() => setPendingDeleteId(note.id)}
                >
                  <Icon name="trash" />
                </button>
              </div>
              {note.quote ? (
                <details className="note-quote">
                  <summary>{note.source}</summary>
                  <blockquote>{note.quote}</blockquote>
                </details>
              ) : (
                <div className="note-quote note-quote-static">{note.source}</div>
              )}
              <label className="note-field note-text-field">
                <span className="sr-only">笔记正文</span>
                <AutoResizeNoteTextarea
                  value={note.text}
                  onChange={(text) => onUpdateNote(note.id, { text })}
                />
              </label>
            </article>
          ))
        )}
      </div>

      <AppLink className="accusation-link" href={accusationHref}>
        提出最终指认
      </AppLink>

      {pendingDeleteNote ? (
        <ConfirmDialog
          title="删除这条笔记？"
          description="删除后无法从当前原型中恢复。"
          confirmLabel="确认删除"
          onCancel={() => setPendingDeleteId(null)}
          onConfirm={() => {
            onDeleteNote(pendingDeleteNote.id);
            setPendingDeleteId(null);
          }}
        />
      ) : null}
    </aside>
  );
}
