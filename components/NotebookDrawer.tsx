"use client";

import Link from "next/link";
import { useState } from "react";
import ConfirmDialog from "./ConfirmDialog";

export type NoteTag = "clue" | "testimony" | "doubt" | "contradiction";
export type NoteFilter = "all" | NoteTag;

export type NotebookNote = {
  id: string;
  title: string;
  text: string;
  tag: NoteTag;
  source: string;
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
}

const tagLabels: Record<NoteFilter, string> = {
  all: "全部",
  clue: "线索",
  testimony: "证词",
  doubt: "疑点",
  contradiction: "矛盾"
};

export default function NotebookDrawer({
  isOpen,
  notes,
  activeTag,
  onToggle,
  onFilterChange,
  onUpdateNote,
  onCreateNote,
  onDeleteNote
}: NotebookDrawerProps) {
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const visibleNotes =
    activeTag === "all" ? notes : notes.filter((note) => note.tag === activeTag);
  const filters = Object.keys(tagLabels) as NoteFilter[];
  const editableTags = filters.filter((tag): tag is NoteTag => tag !== "all");
  const pendingDeleteNote = notes.find((note) => note.id === pendingDeleteId);

  if (!isOpen) {
    return (
      <button
        type="button"
        className="notebook-toggle"
        aria-label="打开侦探笔记"
        onClick={onToggle}
      >
        笔记
      </button>
    );
  }

  return (
    <aside className="notebook-drawer" aria-labelledby="notebook-title">
      <div className="notebook-header">
        <div>
          <p className="notebook-kicker">Detective notebook</p>
          <h2 id="notebook-title">侦探笔记</h2>
        </div>
        <div className="notebook-header-actions">
          <button type="button" className="notebook-create" onClick={onCreateNote}>
            新建笔记
          </button>
          <button
            type="button"
            className="notebook-close"
            aria-label="收起侦探笔记"
            onClick={onToggle}
          >
            ×
          </button>
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
          <p className="notebook-empty">摘录调查回复后，笔记会出现在这里。</p>
        ) : (
          visibleNotes.map((note) => (
            <article className={`note-card note-${note.tag}`} key={note.id}>
              <div className="note-card-header">
                <label className="note-field note-title-field">
                  <span>笔记标题</span>
                  <input
                    value={note.title}
                    aria-label="笔记标题"
                    onChange={(event) =>
                      onUpdateNote(note.id, { title: event.target.value })
                    }
                  />
                </label>
                <label className="note-field note-tag-field">
                  <span>笔记标签</span>
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
              </div>
              <label className="note-field note-text-field">
                <span>笔记正文</span>
                <textarea
                  value={note.text}
                  aria-label="笔记正文"
                  rows={4}
                  onChange={(event) => onUpdateNote(note.id, { text: event.target.value })}
                />
              </label>
              <small>{note.source}</small>
              <button
                type="button"
                className="note-delete"
                aria-label={`删除笔记：${note.title}`}
                onClick={() => setPendingDeleteId(note.id)}
              >
                删除
              </button>
            </article>
          ))
        )}
      </div>

      <Link className="accusation-link" href="/accuse">
        提出最终指控
      </Link>

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
