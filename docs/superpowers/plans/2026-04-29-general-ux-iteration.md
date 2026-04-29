# General UX Iteration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve the prototype's general UX with versioned git history, better notebook workflows, local persistence, Pretext-backed chapter reading, conversation polish, and mobile bottom tabs.

**Architecture:** Keep the current Next.js app and agent API architecture. Add focused client-side helpers for local play state, chapter data, and Pretext layout preparation, then reuse the same state across desktop and mobile layouts. Ship in V0-V3 so each phase is independently testable.

**Tech Stack:** Next.js 15, React 19, TypeScript, Vitest, Testing Library, localStorage, `@chenglou/pretext`.

---

## Source Spec

- Design spec: `docs/superpowers/specs/2026-04-29-general-ux-iteration-design.md`
- Pretext reference: `https://github.com/chenglou/pretext`

## File Structure

Create:

- `lib/game/ids.ts`: deterministic helper wrapper for generated ids.
- `lib/game/play-state.ts`: initial state, localStorage schema, validation, hydration, serialization, reset helpers.
- `lib/game/story.ts`: chapter data derived from the current case text and chapter navigation helpers.
- `lib/reading/pretext-layout.ts`: small isolation layer around Pretext.
- `components/StoryReader.tsx`: chapter reader replacing `StoryPane`.
- `components/ConfirmDialog.tsx`: reusable custom confirmation modal.
- `tests/play-state.test.ts`: localStorage normalization tests.
- `tests/story-reader.test.tsx`: chapter navigation and floating-nav tests.
- `tests/notebook-drawer.test.tsx`: notebook create/delete/sort/filter tests.
- `tests/mobile-tabs.test.tsx`: mobile tab state tests where practical.

Modify:

- `package.json`: add `@chenglou/pretext`.
- `package-lock.json`: update through `npm install`.
- `app/page.tsx`: render `StoryReader` through `InvestigationDesk`.
- `components/InvestigationDesk.tsx`: state ownership, persistence, reset, mobile tabs, conversation polish.
- `components/NotebookDrawer.tsx`: manual note creation, deletion confirmation, timestamps.
- `components/ConversationModule.tsx`: better loading/error/excerpt feedback.
- `app/globals.css`: desktop utilities, dialog, story reader, mobile tabs.
- `tests/smoke.test.tsx`: update old expectations after component rename and notebook API changes.
- `roadmap.md`: mark this UX iteration as underway or update after completion.

---

## Task 0: Git Baseline

**Files:**
- No source edits.

- [ ] **Step 1: Check repository state**

Run:

```bash
git rev-parse --is-inside-work-tree
```

Expected if git is not initialized:

```text
fatal: not a git repository
```

Expected if already initialized:

```text
true
```

- [ ] **Step 2: Initialize git only if needed**

Run only if Step 1 says this is not a git repository:

```bash
git init
```

Expected:

```text
Initialized empty Git repository
```

- [ ] **Step 3: Inspect files before staging**

Run:

```bash
git status --short
```

Expected: project files appear as untracked on first initialization. Confirm no `.env`, secrets, build output, or local browser artifacts are staged.

- [ ] **Step 4: Create baseline commit**

Run:

```bash
git add agents.md app components design.md docs eslint.config.mjs lib next-env.d.ts next.config.mjs package-lock.json package.json readme.md roadmap.md tests tsconfig.json vitest.config.ts
git commit -m "chore: create prototype baseline"
```

Expected: commit succeeds.

- [ ] **Step 5: Verify clean baseline**

Run:

```bash
git status --short
```

Expected:

```text
```

---

## Task 1: Play State and ID Helpers

**Files:**
- Create: `lib/game/ids.ts`
- Create: `lib/game/play-state.ts`
- Test: `tests/play-state.test.ts`

- [ ] **Step 1: Write failing play-state tests**

Create `tests/play-state.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import {
  createInitialPlayState,
  normalizePlayState,
  PLAY_STATE_STORAGE_KEY,
  serializePlayState
} from "../lib/game/play-state";

describe("play state persistence", () => {
  test("creates a versioned initial play state", () => {
    const state = createInitialPlayState();

    expect(state.version).toBe(1);
    expect(state.currentChapterId).toBe("chapter-1");
    expect(state.conversations[0]?.targetId).toBe("general");
    expect(state.notes).toEqual([]);
    expect(state.ui.activeNotebookFilter).toBe("all");
    expect(PLAY_STATE_STORAGE_KEY).toBe("new-novels.play-state.v1");
  });

  test("normalizes partial saved state without losing valid data", () => {
    const normalized = normalizePlayState({
      version: 1,
      currentChapterId: "chapter-2",
      notes: [
        {
          id: "note-1",
          title: "旧笔记",
          text: "正文",
          tag: "clue",
          source: "调查助手"
        }
      ],
      ui: { activeNotebookFilter: "clue", mobileTab: "notebook" }
    });

    expect(normalized.currentChapterId).toBe("chapter-2");
    expect(normalized.notes[0]).toMatchObject({
      id: "note-1",
      title: "旧笔记",
      tag: "clue"
    });
    expect(normalized.notes[0]?.createdAt).toEqual(expect.any(String));
    expect(normalized.ui.activeNotebookFilter).toBe("clue");
    expect(normalized.ui.mobileTab).toBe("notebook");
  });

  test("invalid saved state falls back to initial state", () => {
    const normalized = normalizePlayState("{ broken json");

    expect(normalized.currentChapterId).toBe("chapter-1");
    expect(normalized.notes).toEqual([]);
  });

  test("serializes valid state as JSON", () => {
    const serialized = serializePlayState(createInitialPlayState());

    expect(JSON.parse(serialized)).toMatchObject({
      version: 1,
      currentChapterId: "chapter-1"
    });
  });
});
```

- [ ] **Step 2: Run the failing tests**

Run:

```bash
npm test -- tests/play-state.test.ts
```

Expected: FAIL because `lib/game/play-state.ts` does not exist.

- [ ] **Step 3: Add ID helper**

Create `lib/game/ids.ts`:

```ts
export function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
```

- [ ] **Step 4: Add play-state model and normalization**

Create `lib/game/play-state.ts`:

```ts
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

  return value
    .filter(isRecord)
    .map((note, index) => ({
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
```

- [ ] **Step 5: Verify play-state tests pass**

Run:

```bash
npm test -- tests/play-state.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

Run:

```bash
git add lib/game/ids.ts lib/game/play-state.ts tests/play-state.test.ts
git commit -m "feat: add local play state model"
```

---

## Task 2: Notebook Creation, Deletion, and Confirmation Dialog

**Files:**
- Create: `components/ConfirmDialog.tsx`
- Modify: `components/NotebookDrawer.tsx`
- Modify: `components/InvestigationDesk.tsx`
- Test: `tests/notebook-drawer.test.tsx`
- Modify: `tests/smoke.test.tsx`

- [ ] **Step 1: Write failing notebook tests**

Create `tests/notebook-drawer.test.tsx`:

```tsx
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import NotebookDrawer, {
  type NotebookNote,
  type NoteFilter
} from "../components/NotebookDrawer";

function renderNotebook(initialNotes: NotebookNote[] = []) {
  let notes = initialNotes;
  let activeTag: NoteFilter = "all";

  const handlers = {
    onToggle: vi.fn(),
    onFilterChange: vi.fn((tag: NoteFilter) => {
      activeTag = tag;
    }),
    onUpdateNote: vi.fn((id: string, updates: Partial<NotebookNote>) => {
      notes = notes.map((note) =>
        note.id === id ? { ...note, ...updates, updatedAt: "updated" } : note
      );
    }),
    onCreateNote: vi.fn(() => {
      notes = [
        {
          id: "created-note",
          title: "新笔记",
          text: "",
          tag: "clue",
          source: "手动记录",
          createdAt: "2026-04-29T00:00:00.000Z",
          updatedAt: "2026-04-29T00:00:00.000Z"
        },
        ...notes
      ];
    }),
    onDeleteNote: vi.fn((id: string) => {
      notes = notes.filter((note) => note.id !== id);
    })
  };

  const view = render(
    <NotebookDrawer
      isOpen
      notes={notes}
      activeTag={activeTag}
      {...handlers}
    />
  );

  return { ...view, handlers, getNotes: () => notes, getActiveTag: () => activeTag };
}

test("creates a manual note from the notebook", () => {
  const view = renderNotebook();

  fireEvent.click(screen.getByRole("button", { name: "新建笔记" }));

  expect(view.handlers.onCreateNote).toHaveBeenCalledTimes(1);
});

test("deletes notes only after confirmation", () => {
  const view = renderNotebook([
    {
      id: "note-1",
      title: "线索",
      text: "小锤很轻",
      tag: "clue",
      source: "调查助手",
      createdAt: "2026-04-29T00:00:00.000Z",
      updatedAt: "2026-04-29T00:00:00.000Z"
    }
  ]);

  fireEvent.click(screen.getByRole("button", { name: "删除笔记：线索" }));
  expect(screen.getByRole("dialog", { name: "删除这条笔记？" })).toBeInTheDocument();
  expect(view.handlers.onDeleteNote).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole("button", { name: "确认删除" }));
  expect(view.handlers.onDeleteNote).toHaveBeenCalledWith("note-1");
});
```

- [ ] **Step 2: Run the failing notebook tests**

Run:

```bash
npm test -- tests/notebook-drawer.test.tsx
```

Expected: FAIL because `onCreateNote`, `onDeleteNote`, and the dialog do not exist.

- [ ] **Step 3: Create confirmation dialog**

Create `components/ConfirmDialog.tsx`:

```tsx
"use client";

type ConfirmDialogProps = {
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmDialog({
  title,
  description,
  confirmLabel,
  cancelLabel = "取消",
  onConfirm,
  onCancel
}: ConfirmDialogProps) {
  return (
    <div className="dialog-backdrop" role="presentation">
      <section
        className="confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <h2>{title}</h2>
        <p>{description}</p>
        <div className="dialog-actions">
          <button type="button" className="dialog-secondary" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button type="button" className="dialog-danger" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Modify notebook props and UI**

In `components/NotebookDrawer.tsx`:

- add `createdAt` and `updatedAt` to `NotebookNote`;
- add props `onCreateNote` and `onDeleteNote`;
- render a `新建笔记` button in the notebook header;
- render a delete button per note;
- use `ConfirmDialog` before calling `onDeleteNote`.

The delete state should be local to `NotebookDrawer`:

```tsx
const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
const pendingDeleteNote = notes.find((note) => note.id === pendingDeleteId);
```

The delete button must be accessible:

```tsx
<button
  type="button"
  className="note-delete"
  aria-label={`删除笔记：${note.title}`}
  onClick={() => setPendingDeleteId(note.id)}
>
  删除
</button>
```

The confirmation dialog must call:

```tsx
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
```

- [ ] **Step 5: Wire notebook handlers in InvestigationDesk**

In `components/InvestigationDesk.tsx`, import `makeId` from `lib/game/ids` and add:

```ts
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
```

Update `saveExcerpt` and `updateNote` so saved/updated notes include timestamps.

- [ ] **Step 6: Run notebook and smoke tests**

Run:

```bash
npm test -- tests/notebook-drawer.test.tsx tests/smoke.test.tsx
```

Expected: PASS after updating old `NotebookDrawer` usages in `tests/smoke.test.tsx` to pass `onCreateNote` and `onDeleteNote`.

- [ ] **Step 7: Commit**

Run:

```bash
git add components/ConfirmDialog.tsx components/NotebookDrawer.tsx components/InvestigationDesk.tsx tests/notebook-drawer.test.tsx tests/smoke.test.tsx
git commit -m "feat: improve detective notebook actions"
```

---

## Task 3: Local Persistence and Reset Modal

**Files:**
- Modify: `components/InvestigationDesk.tsx`
- Modify: `app/globals.css`
- Test: `tests/smoke.test.tsx`

- [ ] **Step 1: Add failing persistence test**

Append to `tests/smoke.test.tsx`:

```tsx
test("investigation state persists across reloads and reset requires confirmation", async () => {
  window.localStorage.clear();
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ targetId: "general", label: "调查助手" })
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ content: "锤柄上没有明显血迹。" })
    });
  vi.stubGlobal("fetch", fetchMock);

  const { unmount } = render(<InvestigationDesk storySlot={<section>Story</section>} />);

  const input = screen.getByLabelText("新的调查问题");
  fireEvent.change(input, { target: { value: "看看锤柄" } });
  fireEvent.submit(input.closest("form") as HTMLFormElement);

  await waitFor(() => {
    expect(screen.getByText("锤柄上没有明显血迹。")).toBeInTheDocument();
  });

  unmount();
  render(<InvestigationDesk storySlot={<section>Story</section>} />);
  expect(screen.getByText("锤柄上没有明显血迹。")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "重新开始" }));
  expect(screen.getByRole("dialog", { name: "重新开始调查？" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "取消" }));
  expect(screen.getByText("锤柄上没有明显血迹。")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "重新开始" }));
  fireEvent.click(screen.getByRole("button", { name: "确认重置" }));
  expect(screen.queryByText("锤柄上没有明显血迹。")).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run the failing persistence test**

Run:

```bash
npm test -- tests/smoke.test.tsx
```

Expected: FAIL because persistence and reset UI are not wired.

- [ ] **Step 3: Hydrate from localStorage**

In `components/InvestigationDesk.tsx`, replace separate initial `useState` calls with one initialized play state:

```ts
const [playState, setPlayState] = useState<LocalPlayState>(() => {
  if (typeof window === "undefined") {
    return createInitialPlayState();
  }

  return normalizePlayState(window.localStorage.getItem(PLAY_STATE_STORAGE_KEY));
});
```

Derive:

```ts
const conversations = playState.conversations;
const notes = playState.notes;
const playerState = playState.playerState;
const activeTag = playState.ui.activeNotebookFilter;
const notebookOpen = Boolean(playState.ui.notebookOpen);
```

Use `setPlayState` updates instead of separate setters.

- [ ] **Step 4: Persist on state changes**

Add:

```ts
useEffect(() => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(PLAY_STATE_STORAGE_KEY, serializePlayState(playState));
}, [playState]);
```

- [ ] **Step 5: Add reset button and confirmation**

Add local state:

```ts
const [resetOpen, setResetOpen] = useState(false);
```

Render near the top of `case-shell`:

```tsx
<div className="utility-actions">
  <button type="button" className="utility-button" onClick={() => setResetOpen(true)}>
    重新开始
  </button>
</div>
```

Render:

```tsx
{resetOpen ? (
  <ConfirmDialog
    title="重新开始调查？"
    description="这会清空当前浏览器里的章节进度、对话记录和侦探笔记。"
    confirmLabel="确认重置"
    onCancel={() => setResetOpen(false)}
    onConfirm={() => {
      window.localStorage.removeItem(PLAY_STATE_STORAGE_KEY);
      setPlayState(createInitialPlayState());
      setResetOpen(false);
    }}
  />
) : null}
```

- [ ] **Step 6: Style utilities and dialog**

Add to `app/globals.css`:

```css
.utility-actions {
  position: absolute;
  top: 20px;
  right: 74px;
  z-index: 3;
}

.utility-button {
  border: 1px solid var(--line);
  background: var(--paper);
  color: var(--ink);
  padding: 7px 10px;
  box-shadow: 0 8px 18px var(--shadow);
  font-size: 13px;
}

.dialog-backdrop {
  position: fixed;
  inset: 0;
  z-index: 30;
  display: grid;
  place-items: center;
  background: rgba(32, 32, 32, 0.32);
  padding: 18px;
}

.confirm-dialog {
  width: min(100%, 420px);
  border: 1px solid var(--line);
  background: var(--panel);
  box-shadow: 0 18px 48px rgba(32, 32, 32, 0.22);
  padding: 22px;
}

.confirm-dialog h2 {
  margin: 0 0 8px;
  font-size: 20px;
}

.confirm-dialog p {
  margin: 0;
  color: var(--muted);
  line-height: 1.65;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 18px;
}

.dialog-secondary,
.dialog-danger {
  border: 1px solid var(--line);
  padding: 9px 12px;
}

.dialog-secondary {
  background: var(--paper);
  color: var(--ink);
}

.dialog-danger {
  border-color: #6f2f2a;
  background: #6f2f2a;
  color: var(--paper);
}
```

- [ ] **Step 7: Run tests**

Run:

```bash
npm test -- tests/play-state.test.ts tests/smoke.test.tsx
```

Expected: PASS.

- [ ] **Step 8: Commit**

Run:

```bash
git add components/InvestigationDesk.tsx app/globals.css tests/smoke.test.tsx
git commit -m "feat: persist investigation progress"
```

---

## Task 4: Story Chapters and Pretext Helper

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `lib/game/story.ts`
- Create: `lib/reading/pretext-layout.ts`
- Test: `tests/story-reader.test.tsx`

- [ ] **Step 1: Install Pretext**

Run:

```bash
npm install @chenglou/pretext
```

Expected: package appears in `dependencies` and lockfile updates.

- [ ] **Step 2: Write story helper tests**

Create the first half of `tests/story-reader.test.tsx`:

```tsx
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import {
  getChapterById,
  getNextChapter,
  getPreviousChapter,
  storyChapters
} from "../lib/game/story";

test("story chapters expose ordered navigation", () => {
  expect(storyChapters.length).toBeGreaterThanOrEqual(1);

  const first = getChapterById("chapter-1");

  expect(first?.title).toBe("钟楼下的锤击案");
  expect(getPreviousChapter("chapter-1")).toBeUndefined();
  expect(getNextChapter("chapter-1")?.id).toBe("chapter-2");
});
```

- [ ] **Step 3: Add chapter data and helpers**

Create `lib/game/story.ts`:

```ts
import { hammerOfGodCase } from "../case/hammer-of-god";

export type StoryChapter = {
  id: string;
  title: string;
  subtitle?: string;
  body: string[];
  previousChapterId?: string;
  nextChapterId?: string;
};

const openingParagraphs = hammerOfGodCase.storyText
  .split(/\n\s*\n/)
  .map((paragraph) => paragraph.trim())
  .filter(Boolean);

export const storyChapters: StoryChapter[] = [
  {
    id: "chapter-1",
    title: hammerOfGodCase.title,
    subtitle: "第一章 案发现场",
    body: openingParagraphs,
    nextChapterId: "chapter-2"
  },
  {
    id: "chapter-2",
    title: hammerOfGodCase.title,
    subtitle: "第二章 证词的阴影",
    previousChapterId: "chapter-1",
    body: [
      "威尔弗里德坚持自己从未登上钟楼。铁匠西米恩沉默得像一块铁，只在被问及那把小锤时说，它太轻了。",
      "伊丽莎白提到诺曼时明显迟疑。疯乔则在教堂附近看见过高处的人影，却不愿承认自己当时为什么在那里。"
    ]
  }
];

export function getChapterById(id: string) {
  return storyChapters.find((chapter) => chapter.id === id);
}

export function getPreviousChapter(id: string) {
  const chapter = getChapterById(id);
  return chapter?.previousChapterId
    ? getChapterById(chapter.previousChapterId)
    : undefined;
}

export function getNextChapter(id: string) {
  const chapter = getChapterById(id);
  return chapter?.nextChapterId ? getChapterById(chapter.nextChapterId) : undefined;
}
```

- [ ] **Step 4: Add Pretext wrapper**

Create `lib/reading/pretext-layout.ts`:

```ts
import { layout, prepare } from "@chenglou/pretext";

export type PreparedChapterLayout = {
  prepared: unknown;
  lineCount: number;
  failed: boolean;
};

export function prepareChapterLayout(
  paragraphs: string[],
  width: number,
  lineHeight: number
): PreparedChapterLayout {
  try {
    const text = paragraphs.join("\n\n");
    const prepared = prepare(text);
    const laidOut = layout(prepared, { width, lineHeight });
    const lineCount = Array.isArray(laidOut) ? laidOut.length : 0;

    return { prepared, lineCount, failed: false };
  } catch {
    return { prepared: null, lineCount: paragraphs.length, failed: true };
  }
}
```

If TypeScript reports the Pretext layout options differ, inspect `node_modules/@chenglou/pretext` and adapt this wrapper only. Do not leak Pretext API details into React components.

- [ ] **Step 5: Run story helper tests**

Run:

```bash
npm test -- tests/story-reader.test.tsx
```

Expected: PASS for chapter helpers. If Pretext type errors appear, fix only `lib/reading/pretext-layout.ts`.

- [ ] **Step 6: Commit**

Run:

```bash
git add package.json package-lock.json lib/game/story.ts lib/reading/pretext-layout.ts tests/story-reader.test.tsx
git commit -m "feat: add chapter story model"
```

---

## Task 5: StoryReader Component

**Files:**
- Create: `components/StoryReader.tsx`
- Delete: `components/StoryPane.tsx`
- Modify: `app/page.tsx`
- Modify: `components/InvestigationDesk.tsx`
- Modify: `app/globals.css`
- Test: `tests/story-reader.test.tsx`
- Modify: `tests/smoke.test.tsx`

- [ ] **Step 1: Add StoryReader behavior tests**

Append to `tests/story-reader.test.tsx`:

```tsx
import StoryReader from "../components/StoryReader";

test("story reader renders a scrollable chapter with bottom navigation", () => {
  const onChapterChange = vi.fn();

  render(<StoryReader currentChapterId="chapter-1" onChapterChange={onChapterChange} />);

  expect(screen.getByRole("heading", { name: "钟楼下的锤击案" })).toBeInTheDocument();
  expect(screen.getByText("第一章 案发现场")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "前一章" })).toBeDisabled();

  fireEvent.click(screen.getByRole("button", { name: "后一章" }));
  expect(onChapterChange).toHaveBeenCalledWith("chapter-2");
});

test("clicking the story reader reveals floating chapter controls", () => {
  render(<StoryReader currentChapterId="chapter-1" onChapterChange={vi.fn()} />);

  expect(screen.queryByLabelText("章节快捷导航")).not.toBeInTheDocument();

  fireEvent.click(screen.getByLabelText("故事阅读区"));
  expect(screen.getByLabelText("章节快捷导航")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run failing StoryReader tests**

Run:

```bash
npm test -- tests/story-reader.test.tsx
```

Expected: FAIL because `components/StoryReader.tsx` does not exist.

- [ ] **Step 3: Create StoryReader**

Create `components/StoryReader.tsx`:

```tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  getChapterById,
  getNextChapter,
  getPreviousChapter
} from "../lib/game/story";
import { prepareChapterLayout } from "../lib/reading/pretext-layout";

type StoryReaderProps = {
  currentChapterId: string;
  onChapterChange: (chapterId: string) => void;
};

export default function StoryReader({
  currentChapterId,
  onChapterChange
}: StoryReaderProps) {
  const chapter = getChapterById(currentChapterId) ?? getChapterById("chapter-1");
  const previous = chapter ? getPreviousChapter(chapter.id) : undefined;
  const next = chapter ? getNextChapter(chapter.id) : undefined;
  const [navVisible, setNavVisible] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const layoutMeta = useMemo(() => {
    return prepareChapterLayout(chapter?.body ?? [], 680, 34);
  }, [chapter]);

  useEffect(() => {
    return () => {
      if (hideTimer.current) {
        clearTimeout(hideTimer.current);
      }
    };
  }, []);

  if (!chapter) {
    return null;
  }

  const showFloatingNav = () => {
    setNavVisible(true);
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
    }
    hideTimer.current = setTimeout(() => setNavVisible(false), 2800);
  };

  return (
    <section
      className="story-pane story-reader"
      aria-labelledby="case-title"
      aria-label="故事阅读区"
      onClick={showFloatingNav}
      data-pretext-lines={layoutMeta.lineCount}
      data-pretext-fallback={layoutMeta.failed ? "true" : "false"}
    >
      {navVisible ? (
        <div className="floating-chapter-nav" aria-label="章节快捷导航">
          <button
            type="button"
            disabled={!previous}
            onClick={(event) => {
              event.stopPropagation();
              if (previous) onChapterChange(previous.id);
            }}
          >
            前一章
          </button>
          <button
            type="button"
            disabled={!next}
            onClick={(event) => {
              event.stopPropagation();
              if (next) onChapterChange(next.id);
            }}
          >
            后一章
          </button>
        </div>
      ) : null}

      <div className="story-header">
        <p className="story-source">The Hammer of God</p>
        <h1 id="case-title">{chapter.title}</h1>
        {chapter.subtitle ? <p className="story-chapter">{chapter.subtitle}</p> : null}
      </div>

      <div className="story-text">
        {chapter.body.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>

      <nav className="chapter-nav" aria-label="章节导航">
        <button
          type="button"
          disabled={!previous}
          onClick={(event) => {
            event.stopPropagation();
            if (previous) onChapterChange(previous.id);
          }}
        >
          前一章
        </button>
        <button
          type="button"
          disabled={!next}
          onClick={(event) => {
            event.stopPropagation();
            if (next) onChapterChange(next.id);
          }}
        >
          后一章
        </button>
      </nav>
    </section>
  );
}
```

- [ ] **Step 4: Wire current chapter through InvestigationDesk**

Change `InvestigationDeskProps` to:

```ts
interface InvestigationDeskProps {
  storySlot: (props: {
    currentChapterId: string;
    onChapterChange: (chapterId: string) => void;
  }) => ReactNode;
}
```

Render story with:

```tsx
{storySlot({
  currentChapterId: playState.currentChapterId,
  onChapterChange: (currentChapterId) =>
    setPlayState((current) => ({ ...current, currentChapterId }))
})}
```

- [ ] **Step 5: Update page**

Modify `app/page.tsx`:

```tsx
import InvestigationDesk from "../components/InvestigationDesk";
import StoryReader from "../components/StoryReader";

export default function Page() {
  return (
    <InvestigationDesk
      storySlot={(storyProps) => <StoryReader {...storyProps} />}
    />
  );
}
```

- [ ] **Step 6: Remove old StoryPane**

Delete `components/StoryPane.tsx` after all imports are replaced.

- [ ] **Step 7: Add StoryReader CSS**

Add to `app/globals.css`:

```css
.story-reader {
  position: relative;
}

.floating-chapter-nav {
  position: sticky;
  top: 0;
  z-index: 2;
  display: flex;
  justify-content: center;
  gap: 10px;
  margin: -18px auto 18px;
  pointer-events: auto;
}

.floating-chapter-nav button,
.chapter-nav button {
  border: 1px solid var(--line);
  background: var(--paper);
  color: var(--ink);
  padding: 8px 12px;
  box-shadow: 0 8px 18px var(--shadow);
}

.chapter-nav {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  max-width: 720px;
  margin: 36px auto 0;
  padding-top: 18px;
  border-top: 1px solid var(--line);
}
```

- [ ] **Step 8: Update tests and run**

Update `tests/smoke.test.tsx` where `InvestigationDesk` is rendered:

```tsx
<InvestigationDesk storySlot={() => <section>Story</section>} />
```

Run:

```bash
npm test -- tests/story-reader.test.tsx tests/smoke.test.tsx
```

Expected: PASS.

- [ ] **Step 9: Commit**

Run:

```bash
git add app/page.tsx app/globals.css components/StoryReader.tsx components/InvestigationDesk.tsx tests/story-reader.test.tsx tests/smoke.test.tsx
git rm components/StoryPane.tsx
git commit -m "feat: add pretext chapter reader"
```

---

## Task 6: Conversation Polish

**Files:**
- Modify: `components/ConversationModule.tsx`
- Modify: `components/InvestigationDesk.tsx`
- Modify: `app/globals.css`
- Test: `tests/smoke.test.tsx`

- [ ] **Step 1: Add keyboard submit and excerpt feedback test**

Append to `tests/smoke.test.tsx`:

```tsx
test("conversation input supports keyboard submit and excerpt feedback", async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ targetId: "general", label: "调查助手" })
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ content: "现场没有明显拖拽痕迹。" })
    });
  vi.stubGlobal("fetch", fetchMock);

  render(<InvestigationDesk storySlot={() => <section>Story</section>} />);

  const input = screen.getByLabelText("新的调查问题");
  fireEvent.change(input, { target: { value: "现场有没有拖拽痕迹" } });
  fireEvent.keyDown(input, { key: "Enter", metaKey: true });

  await waitFor(() => {
    expect(screen.getByText("现场没有明显拖拽痕迹。")).toBeInTheDocument();
  });

  fireEvent.click(screen.getByRole("button", { name: "摘录这条回复" }));
  expect(screen.getByText("已加入侦探笔记。")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run failing polish test**

Run:

```bash
npm test -- tests/smoke.test.tsx
```

Expected: FAIL because keyboard submit and feedback are missing.

- [ ] **Step 3: Add keyboard submit**

In `InvestigationDesk`, add:

```ts
const formRef = useRef<HTMLFormElement | null>(null);

const submitOnShortcut = (event: KeyboardEvent<HTMLTextAreaElement>) => {
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
    event.preventDefault();
    formRef.current?.requestSubmit();
  }
};
```

Attach:

```tsx
<form ref={formRef} className="global-input" onSubmit={submitMessage}>
```

and:

```tsx
onKeyDown={submitOnShortcut}
```

- [ ] **Step 4: Add excerpt feedback**

Add state:

```ts
const [excerptNotice, setExcerptNotice] = useState<string | null>(null);
```

Update `saveExcerpt`:

```ts
setExcerptNotice("已加入侦探笔记。");
window.setTimeout(() => setExcerptNotice(null), 1800);
```

Render:

```tsx
{excerptNotice ? <p className="excerpt-notice">{excerptNotice}</p> : null}
```

- [ ] **Step 5: Improve excerpt button label**

In `ConversationModule`, change the assistant excerpt button to:

```tsx
<button
  type="button"
  className="excerpt-button"
  aria-label="摘录这条回复"
  onClick={() => onSaveExcerpt(message.content)}
>
  摘录
</button>
```

- [ ] **Step 6: Add CSS**

Add:

```css
.excerpt-notice {
  margin: 0 14px 10px;
  border: 1px solid rgba(65, 92, 68, 0.28);
  background: #f3fbf1;
  color: #315a35;
  padding: 8px 10px;
  font-size: 13px;
}
```

- [ ] **Step 7: Run tests and commit**

Run:

```bash
npm test -- tests/smoke.test.tsx
```

Expected: PASS.

Commit:

```bash
git add components/ConversationModule.tsx components/InvestigationDesk.tsx app/globals.css tests/smoke.test.tsx
git commit -m "feat: polish investigation conversation flow"
```

---

## Task 7: Mobile Bottom Tabs

**Files:**
- Modify: `components/InvestigationDesk.tsx`
- Modify: `app/globals.css`
- Test: `tests/mobile-tabs.test.tsx`

- [ ] **Step 1: Write mobile tab test**

Create `tests/mobile-tabs.test.tsx`:

```tsx
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import InvestigationDesk from "../components/InvestigationDesk";

test("mobile bottom tabs switch primary workspace without losing state", () => {
  render(<InvestigationDesk storySlot={() => <section>Story workspace</section>} />);

  expect(screen.getByText("Story workspace")).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: "故事" })).toHaveAttribute("aria-selected", "true");

  fireEvent.click(screen.getByRole("tab", { name: "调查" }));
  expect(screen.getByRole("tab", { name: "调查" })).toHaveAttribute("aria-selected", "true");
  expect(screen.getByRole("heading", { name: "调查台" })).toBeInTheDocument();

  fireEvent.click(screen.getByRole("tab", { name: "笔记" }));
  expect(screen.getByRole("tab", { name: "笔记" })).toHaveAttribute("aria-selected", "true");
  expect(screen.getByRole("heading", { name: "侦探笔记" })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run failing mobile test**

Run:

```bash
npm test -- tests/mobile-tabs.test.tsx
```

Expected: FAIL because tabs are missing.

- [ ] **Step 3: Add mobile tab state**

In `InvestigationDesk`, derive:

```ts
const mobileTab = playState.ui.mobileTab ?? "story";
const setMobileTab = (mobileTab: MobileTab) => {
  setPlayState((current) => ({
    ...current,
    ui: { ...current.ui, mobileTab }
  }));
};
```

- [ ] **Step 4: Wrap workspaces**

Render story, investigation, and notebook with workspace classes:

```tsx
<div className={`workspace workspace-story ${mobileTab === "story" ? "is-mobile-active" : ""}`}>
  {storySlot(...)}
</div>
<section className={`investigation-desk workspace workspace-investigation ${mobileTab === "investigation" ? "is-mobile-active" : ""}`}>
  ...
</section>
<div className={`workspace workspace-notebook ${mobileTab === "notebook" ? "is-mobile-active" : ""}`}>
  <NotebookDrawer isOpen={notebookOpen || mobileTab === "notebook"} ... />
</div>
```

Keep desktop drawer behavior unchanged through CSS. On mobile, notebook should be visible as its own tab.

- [ ] **Step 5: Add bottom tab bar**

Add:

```tsx
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
```

- [ ] **Step 6: Add mobile CSS**

Append inside `@media (max-width: 640px)`:

```css
.case-shell,
.case-shell.notebook-open {
  display: block;
  min-height: 100vh;
  padding: 12px 12px 74px;
}

.workspace {
  display: none;
}

.workspace.is-mobile-active {
  display: block;
}

.workspace-story .story-pane,
.workspace-investigation,
.workspace-notebook .notebook-drawer {
  min-height: calc(100vh - 98px);
  max-height: none;
}

.mobile-tabbar {
  position: fixed;
  right: 12px;
  bottom: 12px;
  left: 12px;
  z-index: 20;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  border: 1px solid var(--line);
  background: var(--paper);
  box-shadow: 0 12px 30px var(--shadow);
}

.mobile-tabbar button {
  border: 0;
  border-right: 1px solid var(--line);
  background: transparent;
  color: var(--ink);
  padding: 12px 8px;
}

.mobile-tabbar button:last-child {
  border-right: 0;
}

.mobile-tabbar button[aria-selected="true"] {
  background: var(--primary);
  color: var(--paper);
}
```

Add desktop default:

```css
.mobile-tabbar {
  display: none;
}
```

- [ ] **Step 7: Run mobile tests**

Run:

```bash
npm test -- tests/mobile-tabs.test.tsx tests/smoke.test.tsx
```

Expected: PASS.

- [ ] **Step 8: Commit**

Run:

```bash
git add components/InvestigationDesk.tsx app/globals.css tests/mobile-tabs.test.tsx
git commit -m "feat: add mobile workspace tabs"
```

---

## Task 8: Documentation, Roadmap, and Full Verification

**Files:**
- Modify: `roadmap.md`
- Optional modify: `design.md`

- [ ] **Step 1: Update roadmap**

In `roadmap.md`, add an entry under current/near-term work:

```md
### General UX Iteration

- Git baseline is established before future product iterations.
- Detective notebook supports manual notes, editing, tag filtering, newest-first ordering, and delete confirmation.
- Play state persists locally across reloads and can be reset only through a confirmation modal.
- Story reading uses a Pretext-backed chapter reader with one chapter per scrollable page.
- Chapter navigation is available at the bottom of the chapter and through click-to-reveal floating controls.
- Mobile uses Story / Investigation / Notebook bottom tabs with shared state.
```

- [ ] **Step 2: Run full automated verification**

Run:

```bash
npm run lint
npm test
npm run build
```

Expected: all commands PASS.

- [ ] **Step 3: Manual browser verification**

Run the dev server:

```bash
npm run dev
```

Open the local URL shown by Next.js and manually verify:

- desktop shows story left, investigation right, notebook button top-right;
- notebook opens and closes;
- manual note creation works;
- note editing works;
- note delete opens confirmation and cancel preserves the note;
- reset opens confirmation and cancel preserves state;
- confirmed reset clears saved state;
- story chapter bottom navigation works;
- clicking story reveals floating chapter navigation;
- investigation routing still works with mocked or real API settings;
- mobile viewport shows bottom Story / Investigation / Notebook tabs;
- switching mobile tabs preserves state.

- [ ] **Step 4: Commit docs**

Run:

```bash
git add roadmap.md design.md
git commit -m "docs: update ux iteration roadmap"
```

If `design.md` did not change, stage only `roadmap.md`.

---

## Self-Review Notes

Spec coverage:

- V0 git baseline is Task 0.
- V1 notes, persistence, and reset are Tasks 1-3.
- V2 Pretext chapter reader and conversation polish are Tasks 4-6.
- V3 mobile bottom tabs are Task 7.
- Documentation and verification are Task 8.

Placeholder scan:

- The plan contains no unresolved placeholder steps or vague edge-case instructions.
- The only conditional instruction is for adapting Pretext wrapper types after installing the actual package, isolated to `lib/reading/pretext-layout.ts`.

Type consistency:

- `Conversation`, `ConversationTarget`, `MobileTab`, and `LocalPlayState` are defined before use.
- `NotebookNote` timestamp fields are introduced before persistence uses them.
- `StoryChapter` and chapter helpers are introduced before `StoryReader` uses them.
